const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const passportFillerBaseUrl = process.env.PASSPORT_FILLER_BASE_URL;
const passportFillerApiToken = process.env.PASSPORT_FILLER_API_TOKEN;
const passportFillerApiPrefix =
  process.env.PASSPORT_FILLER_API_PREFIX ?? "/api";
const passportFillerTimeoutMsRaw = process.env.PASSPORT_FILLER_TIMEOUT_MS;
const passportFillerRetryCountRaw = process.env.PASSPORT_FILLER_RETRY_COUNT;
const passportFillerFeatureEnabledRaw =
  process.env.PASSPORT_FILLER_ENABLED ?? "false";

export const publicEnv = {
  supabaseUrl: publicSupabaseUrl ?? "",
  supabasePublishableKey: publicSupabasePublishableKey ?? "",
};

export const publicEnvStatus = {
  hasSupabaseUrl: Boolean(publicSupabaseUrl),
  hasSupabasePublishableKey: Boolean(publicSupabasePublishableKey),
  isSupabaseConfigured: Boolean(
    publicSupabaseUrl && publicSupabasePublishableKey,
  ),
};

export function assertPublicSupabaseEnv() {
  if (!publicSupabaseUrl || !publicSupabasePublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    supabaseUrl: publicSupabaseUrl,
    supabasePublishableKey: publicSupabasePublishableKey,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const passportFillerEnv = {
  enabled:
    passportFillerFeatureEnabledRaw === "1" ||
    passportFillerFeatureEnabledRaw.toLowerCase() === "true",
  baseUrl: passportFillerBaseUrl ?? "",
  apiToken: passportFillerApiToken ?? "",
  apiPrefix: passportFillerApiPrefix.startsWith("/")
    ? passportFillerApiPrefix
    : `/${passportFillerApiPrefix}`,
  timeoutMs: parsePositiveInt(passportFillerTimeoutMsRaw, 30000),
  retryCount: parsePositiveInt(passportFillerRetryCountRaw, 2),
};

export function assertPassportFillerEnv() {
  if (!passportFillerEnv.enabled) {
    throw new Error(
      "Passport filler integration is disabled. Set PASSPORT_FILLER_ENABLED=true.",
    );
  }

  if (!passportFillerEnv.baseUrl) {
    throw new Error("Missing PASSPORT_FILLER_BASE_URL.");
  }

  return passportFillerEnv;
}
