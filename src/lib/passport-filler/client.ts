import { assertPassportFillerEnv } from "@/lib/env";
import {
  PassportFillerError,
  type PassportFillerCreateProjectResponse,
  type PassportFillerProjectInput,
  type PassportFillerProjectState,
  type PassportFillerStartResponse,
} from "@/types/passport-filler";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  acceptBinary?: boolean;
};

export class PassportFillerClient {
  private readonly baseUrl: string;
  private readonly apiPrefix: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;
  private readonly retryCount: number;

  constructor() {
    const env = assertPassportFillerEnv();
    this.baseUrl = env.baseUrl.replace(/\/+$/g, "");
    this.apiPrefix = env.apiPrefix.replace(/\/+$/g, "");
    this.apiToken = env.apiToken;
    this.timeoutMs = env.timeoutMs;
    this.retryCount = env.retryCount;
  }

  async createProject(
    payload: PassportFillerProjectInput,
  ): Promise<PassportFillerCreateProjectResponse> {
    return this.request<PassportFillerCreateProjectResponse>("/projects/manual", {
      method: "POST",
      body: payload,
    });
  }

  async startProject(projectId: string): Promise<PassportFillerStartResponse> {
    return this.request<PassportFillerStartResponse>(`/projects/${projectId}/start`, {
      method: "POST",
    });
  }

  async getProject(projectId: string): Promise<PassportFillerProjectState> {
    return this.request<PassportFillerProjectState>(`/projects/${projectId}`);
  }

  async downloadPassport(projectId: string): Promise<Blob> {
    return this.request<Blob>(`/projects/${projectId}/passport.xlsx`, {
      method: "GET",
      acceptBinary: true,
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.retryCount) {
      try {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => {
          controller.abort();
        }, this.timeoutMs);

        try {
          const response = await fetch(`${this.baseUrl}${this.apiPrefix}${path}`, {
            method,
            headers: {
              "content-type": "application/json",
              ...(this.apiToken
                ? { authorization: `Bearer ${this.apiToken}` }
                : {}),
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            cache: "no-store",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw await toPassportFillerError(response);
          }

          if (options.acceptBinary) {
            return (await response.blob()) as T;
          }

          return (await response.json()) as T;
        } finally {
          clearTimeout(timeoutHandle);
        }
      } catch (error) {
        const normalized = normalizeRequestError(error);
        lastError = normalized;

        const shouldRetry =
          normalized instanceof PassportFillerError
            ? normalized.retriable
            : true;

        if (!shouldRetry || attempt >= this.retryCount) {
          throw normalized;
        }

        await sleep(250 * (attempt + 1));
        attempt += 1;
      }
    }

    throw lastError ?? new Error("Passport filler request failed.");
  }
}

async function toPassportFillerError(response: Response) {
  const status = response.status;
  let detail = "";

  try {
    const body = await response.json();
    detail = typeof body?.detail === "string" ? body.detail : "";
  } catch {
    detail = "";
  }

  const message = detail || `Passport filler request failed (${status}).`;

  if (status === 400) {
    return new PassportFillerError(message, {
      code: "bad_request",
      status,
      retriable: false,
    });
  }

  if (status === 401 || status === 403) {
    return new PassportFillerError(message, {
      code: "unauthorized",
      status,
      retriable: false,
    });
  }

  if (status === 404) {
    return new PassportFillerError(message, {
      code: "not_found",
      status,
      retriable: false,
    });
  }

  if (status === 408 || status === 429 || status >= 500) {
    return new PassportFillerError(message, {
      code: "upstream",
      status,
      retriable: true,
    });
  }

  return new PassportFillerError(message, {
    code: "unknown",
    status,
    retriable: false,
  });
}

function normalizeRequestError(error: unknown) {
  if (error instanceof PassportFillerError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new PassportFillerError("Внешний сервис не ответил вовремя.", {
      code: "timeout",
      retriable: true,
    });
  }

  if (error instanceof Error) {
    return new PassportFillerError(error.message, {
      code: "network",
      retriable: true,
    });
  }

  return new PassportFillerError("Неизвестная ошибка запроса passport filler.", {
    code: "unknown",
    retriable: false,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
