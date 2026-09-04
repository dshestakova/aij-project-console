import "server-only";

import { randomUUID } from "node:crypto";

import { getGigaChatConfig, type GigaChatConfig } from "@/lib/gigachat/config";

type ChatMessage = { role: "system" | "user"; content: string };

type TokenState = {
  accessToken: string;
  expiresAtSeconds: number;
};

const OAUTH_PATH_SUFFIX = "/api/v2/oauth";
const DEFAULT_CHAT_BASE_URL = "https://api.giga.chat/v1";

let cachedToken: TokenState | null = null;
let inflightToken: Promise<TokenState> | null = null;

function basicAuthorization(credentials: string) {
  const value = credentials.toLowerCase().startsWith("basic ")
    ? credentials.slice(6).trim()
    : credentials;
  return `Basic ${value}`;
}

function chatUrl(baseUrl: string) {
  let resolved = baseUrl;
  if (resolved.endsWith(OAUTH_PATH_SUFFIX)) {
    resolved = DEFAULT_CHAT_BASE_URL;
  }
  if (resolved.endsWith("/v1")) {
    return `${resolved}/chat/completions`;
  }
  return `${resolved}/v1/chat/completions`;
}

async function gigachatFetch(
  url: string,
  init: RequestInit,
  config: GigaChatConfig,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    if (!config.verifySslCerts) {
      const { Agent, fetch: undiciFetch } = await import("undici");
      const dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
      const undiciInit = {
        ...init,
        dispatcher,
        signal: controller.signal,
      } as Parameters<typeof undiciFetch>[1];
      return (await undiciFetch(url, undiciInit)) as unknown as Response;
    }

    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseExpiresAt(raw: unknown) {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("OAuth GigaChat вернул невалидный expires_at");
  }
  return value > 10_000_000_000 ? value / 1000 : value;
}

async function fetchAccessToken(config: GigaChatConfig): Promise<TokenState> {
  const response = await gigachatFetch(
    config.authUrl,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        RqUID: randomUUID(),
        Authorization: basicAuthorization(config.credentials),
      },
      body: new URLSearchParams({ scope: config.scope }).toString(),
    },
    config,
  );

  if (response.status === 401 || response.status === 400) {
    throw new Error(`OAuth GigaChat отклонён, HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`OAuth GigaChat, HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
    expires_at?: unknown;
  };
  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new Error("OAuth GigaChat вернул пустой access_token");
  }

  return {
    accessToken: payload.access_token,
    expiresAtSeconds: parseExpiresAt(payload.expires_at),
  };
}

async function getAccessToken(
  config: GigaChatConfig,
  forceRefresh = false,
): Promise<string> {
  const now = Date.now() / 1000;
  if (
    !forceRefresh &&
    cachedToken &&
    now < cachedToken.expiresAtSeconds - config.tokenRefreshMarginSeconds
  ) {
    return cachedToken.accessToken;
  }

  if (forceRefresh) {
    inflightToken = null;
  }

  if (!inflightToken) {
    inflightToken = fetchAccessToken(config).then((token) => {
      cachedToken = token;
      inflightToken = null;
      return token;
    });
  }

  try {
    const token = await inflightToken;
    return token.accessToken;
  } catch (error) {
    inflightToken = null;
    cachedToken = null;
    throw error;
  }
}

async function chatOnce(
  config: GigaChatConfig,
  accessToken: string,
  messages: ChatMessage[],
) {
  const response = await gigachatFetch(
    chatUrl(config.baseUrl),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        RqUID: randomUUID(),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        temperature: config.temperature,
        max_tokens: 8000,
        profanity_check: config.profanityCheck,
      }),
    },
    config,
  );

  if (response.status === 401) {
    const error = new Error("Access token GigaChat отклонён");
    error.name = "GigaChatBearerRejected";
    throw error;
  }
  if (!response.ok) {
    throw new Error(`Chat completion GigaChat, HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("пустой ответ модели");
  }
  return content;
}

async function withRetries<T>(
  config: GigaChatConfig,
  operation: () => Promise<T>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (
        error instanceof Error &&
        error.name === "GigaChatBearerRejected"
      ) {
        throw error;
      }
      if (attempt >= config.maxRetries) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, Math.min(250 * 2 ** attempt, 2000));
      });
    }
  }
  throw lastError;
}

export async function completeGigaChatChat(messages: ChatMessage[]) {
  const config = getGigaChatConfig();
  if (!config) {
    throw new Error("GigaChat не настроен");
  }

  let accessToken = await getAccessToken(config);
  try {
    return await withRetries(config, () => chatOnce(config, accessToken, messages));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "GigaChatBearerRejected") {
      throw error;
    }
    cachedToken = null;
    accessToken = await getAccessToken(config, true);
    try {
      return await withRetries(config, () =>
        chatOnce(config, accessToken, messages),
      );
    } catch (retryError) {
      if (
        retryError instanceof Error &&
        retryError.name === "GigaChatBearerRejected"
      ) {
        throw new Error("Access token GigaChat повторно отклонён");
      }
      throw retryError;
    }
  }
}

export { getGigaChatConfig };
