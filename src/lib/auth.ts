// ── Butterbase Auth adapter ───────────────────────────────────────
// Real JWT auth (signup/login/refresh/logout) against the Butterbase
// Auth API. Falls back to a local mock session when unconfigured, so the
// demo never gets blocked by a network hiccup on stage.

import { config, authMode } from "./config";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  email_verified?: boolean;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  user: AuthUser;
}

// Pre-seeded demo account. Password satisfies Butterbase policy
// (8+ chars, upper, lower, number, special).
export const DEMO_EMAIL = "maya@school.edu";
export const DEMO_PASSWORD = "EmberMaya1!";
export const DEMO_NAME = "Maya";

const LS_KEY = "ember:session";
let session: Session | null = loadSession();

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function persist(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(LS_KEY, JSON.stringify(s));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* storage full / private mode — session stays in memory */
  }
}

function sessionFromTokenResponse(j: any, fallbackUser?: AuthUser): Session {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in ? j.expires_in * 1000 : 3600_000),
    user: j.user || fallbackUser || session?.user!,
  };
}

// ── Public API ────────────────────────────────────────────────────

export function currentUser(): AuthUser | null {
  return session?.user ?? null;
}

/** Fresh access token for Data API writes, refreshing if it's about to expire. */
export async function getAccessToken(): Promise<string | null> {
  if (!session) return null;
  if (authMode === "mock") return session.access_token;
  if (Date.now() > session.expires_at - 60_000) {
    try {
      await refresh();
    } catch {
      /* fall through with the stale token; a 401 will surface downstream */
    }
  }
  return session.access_token;
}

/** Log in; if the account doesn't exist yet, sign it up transparently. */
export async function authenticate(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  if (authMode === "mock") {
    const user: AuthUser = { id: `local-${email}`, email, display_name: displayName || DEMO_NAME };
    persist({ access_token: "mock", refresh_token: "mock", expires_at: Date.now() + 36e5, user });
    return user;
  }
  try {
    return await login(email, password);
  } catch (e: any) {
    if (e?.status === 400 || e?.status === 401 || e?.status === 404) {
      return await signup(email, password, displayName || email.split("@")[0]);
    }
    throw e;
  }
}

export async function signup(email: string, password: string, display_name: string): Promise<AuthUser> {
  const j = await authFetch("/signup", { email, password, display_name });
  // Butterbase signup returns the user but not always tokens — log in to get a session.
  if (j.access_token) {
    persist(sessionFromTokenResponse(j));
    return session!.user;
  }
  return await login(email, password);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const j = await authFetch("/login", { email, password });
  persist(sessionFromTokenResponse(j));
  return session!.user;
}

async function refresh(): Promise<void> {
  if (!session?.refresh_token) throw new Error("no refresh token");
  const j = await authFetch("/refresh", { refresh_token: session.refresh_token });
  persist(sessionFromTokenResponse(j, session.user));
}

export async function logout(): Promise<void> {
  const token = session?.access_token;
  persist(null);
  if (authMode === "mock" || !token) return;
  try {
    await fetch(`${config.butterbaseAuthUrl}/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    /* best-effort */
  }
}

// ── transport ─────────────────────────────────────────────────────

async function authFetch(path: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${config.butterbaseAuthUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err: any = new Error(`Auth ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
