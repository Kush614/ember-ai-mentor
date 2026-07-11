// Centralized env access. Everything degrades to mocks when unset.
const env = import.meta.env as Record<string, string | undefined>;

const butterbaseAppId = env.VITE_BUTTERBASE_APP_ID || "";

// Data API:  https://api.butterbase.ai/v1/{app_id}
// Auth API:  https://api.butterbase.ai/auth/{app_id}
// Both derive from the app id; explicit URLs override for self-hosted/proxy setups.
const butterbaseDataUrl =
  env.VITE_BUTTERBASE_URL || (butterbaseAppId ? `https://api.butterbase.ai/v1/${butterbaseAppId}` : "");
const butterbaseAuthUrl =
  env.VITE_BUTTERBASE_AUTH_URL ||
  (butterbaseAppId
    ? `https://api.butterbase.ai/auth/${butterbaseAppId}`
    : butterbaseDataUrl.includes("/v1/")
    ? butterbaseDataUrl.replace("/v1/", "/auth/")
    : "");

export const config = {
  anthropicKey: env.VITE_ANTHROPIC_API_KEY || "",
  anthropicModel: env.VITE_ANTHROPIC_MODEL || "claude-opus-4-8",

  nebiusKey: env.VITE_NEBIUS_API_KEY || "",
  nebiusBaseUrl: env.VITE_NEBIUS_BASE_URL || "https://api.studio.nebius.com/v1",
  nebiusModel: env.VITE_NEBIUS_MODEL || "",

  everosKey: env.VITE_EVEROS_API_KEY || "",
  everosBaseUrl: env.VITE_EVEROS_BASE_URL || "",

  butterbaseAppId,
  butterbaseUrl: butterbaseDataUrl, // data API base (kept name for existing callers)
  butterbaseAuthUrl,
  butterbaseKey: env.VITE_BUTTERBASE_KEY || "", // bb_sk_ service key (optional; JWT preferred)

  // Claude via the Butterbase `claude` function (key stays server-side).
  claudeProxyUrl: butterbaseDataUrl ? `${butterbaseDataUrl}/fn/claude` : "",
};

// "proxy" = Claude through the Butterbase function (preferred when Butterbase
// is configured; no key in the browser). Nebius wins if a Nebius key is set;
// direct Anthropic only if a raw VITE_ANTHROPIC_API_KEY is provided.
export const llmMode: "nebius" | "proxy" | "anthropic" | "mock" = config.nebiusKey
  ? "nebius"
  : config.claudeProxyUrl
  ? "proxy"
  : config.anthropicKey
  ? "anthropic"
  : "mock";

export const memoryMode: "everos" | "mock" = config.everosBaseUrl && config.everosKey
  ? "everos"
  : "mock";

// EverOS episodic memory is reached through the Butterbase `everos` function
// (key stays server-side), so it's live whenever Butterbase is configured.
export const everosMode: "everos" | "mock" =
  config.butterbaseUrl || (config.everosBaseUrl && config.everosKey) ? "everos" : "mock";

export const backendMode: "butterbase" | "mock" = config.butterbaseUrl ? "butterbase" : "mock";

export const authMode: "butterbase" | "mock" = config.butterbaseAuthUrl ? "butterbase" : "mock";
