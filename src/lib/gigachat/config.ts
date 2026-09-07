import "server-only";

export type GigaChatConfig = {
  credentials: string;
  scope: string;
  baseUrl: string;
  authUrl: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  profanityCheck: boolean;
  verifySslCerts: boolean;
  maxRetries: number;
  tokenRefreshMarginSeconds: number;
};

function envBool(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  return /^(1|true|yes)$/iu.test(raw);
}

function envNumber(name: string, fallback: number) {
  const parsed = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envInt(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGigaChatConfig(): GigaChatConfig | null {
  const credentials = (
    process.env.GIGACHAT_CREDENTIALS ??
    process.env.GIGACHAT_AUTH_KEY ??
    ""
  ).trim();
  const enabledRaw = process.env.APPLICATION_LLM_ENABLED;
  const enabled = enabledRaw
    ? /^(1|true)$/iu.test(enabledRaw)
    : Boolean(credentials);

  if (!enabled || !credentials) {
    return null;
  }

  const timeoutSeconds = envNumber("GIGACHAT_TIMEOUT_SECONDS", 120);
  const timeoutMsFallback = envInt("APPLICATION_LLM_TIMEOUT_MS", 120000);
  const timeoutMs =
    timeoutSeconds > 0 ? Math.round(timeoutSeconds * 1000) : timeoutMsFallback;

  const temperature = envNumber("GIGACHAT_TEMPERATURE", 0.11);
  const maxRetries = Number.parseInt(process.env.GIGACHAT_MAX_RETRIES ?? "2", 10);

  return {
    credentials,
    scope: process.env.GIGACHAT_SCOPE?.trim() || "GIGACHAT_API_CORP",
    baseUrl: (
      process.env.GIGACHAT_BASE_URL?.trim() || "https://api.giga.chat/v1"
    ).replace(/\/+$/u, ""),
    authUrl: (
      process.env.GIGACHAT_AUTH_URL?.trim() ||
      "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
    ).replace(/\/+$/u, ""),
    model:
      process.env.GIGACHAT_MODEL?.trim() ||
      process.env.APPLICATION_LLM_MODEL?.trim() ||
      "GigaChat-2-Max",
    timeoutMs: timeoutMs > 0 ? timeoutMs : 120000,
    temperature: Number.isFinite(temperature) ? temperature : 0.11,
    profanityCheck: envBool("GIGACHAT_PROFANITY_CHECK", false),
    verifySslCerts: envBool("GIGACHAT_VERIFY_SSL_CERTS", false),
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 2,
    tokenRefreshMarginSeconds: envInt("GIGACHAT_TOKEN_REFRESH_MARGIN_SECONDS", 60),
  };
}
