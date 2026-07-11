// Butterbase serverless function: EverOS memory proxy.
// Keeps EVEROS_API_KEY server-side and gives the browser a CORS-friendly
// endpoint for ingesting exchanges and recalling episodic memory.
//
// Deployed at: https://api.butterbase.ai/v1/{app_id}/fn/everos
// Body: { op: "ingest" | "recall" | "flush", user_id, session_id?, messages?, query?, top_k? }

const EVEROS = "https://api.evermind.ai";
const ALLOW = [
  "https://ember.butterbase.dev",
  "http://localhost:5173",
  "http://localhost:4173",
];

function cors(origin) {
  const o = ALLOW.includes(origin) ? origin : "https://ember.butterbase.dev";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    Vary: "Origin",
  };
}

export default async function handler(req, ctx) {
  const origin = req.headers.get("origin") || "";
  const ch = cors(origin);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json", ...ch },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = ctx?.env?.EVEROS_API_KEY;
  if (!key) return json({ error: "EVEROS_API_KEY not configured" }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const { op, user_id, session_id, messages, query, top_k } = body || {};
  if (!user_id) return json({ error: "user_id required" }, 400);

  const ev = (path, payload) =>
    fetch(EVEROS + path, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  try {
    if (op === "ingest") {
      const r = await ev("/api/v1/memories", { user_id, session_id, messages: messages || [] });
      const d = await r.json().catch(() => ({}));
      return json({ ok: r.ok, task_id: d?.data?.task_id, status: d?.data?.status });
    }
    if (op === "flush") {
      const r = await ev("/api/v1/memories/flush", { user_id, session_id });
      const d = await r.json().catch(() => ({}));
      return json({ ok: r.ok, status: d?.data?.status });
    }
    if (op === "recall") {
      const r = await ev("/api/v1/memories/search", {
        query: query || "",
        filters: { user_id },
        method: "hybrid",
        top_k: top_k || 5,
      });
      const d = await r.json().catch(() => ({}));
      const episodes = (d?.data?.episodes || []).map((e) => ({
        id: e.id,
        summary: e.summary || e.episode || "",
        subject: e.subject || "",
        timestamp: e.timestamp,
      }));
      return json({ ok: r.ok, episodes, profiles: d?.data?.profiles || [] });
    }
    if (op === "dump") {
      // Everything EverOS has stored for this learner — the "memory reveal".
      const [epR, prR] = await Promise.all([
        ev("/api/v1/memories/get", { memory_type: "episodic_memory", filters: { user_id }, page_size: 50 }),
        ev("/api/v1/memories/get", { memory_type: "profile", filters: { user_id }, page_size: 50 }),
      ]);
      const ep = await epR.json().catch(() => ({}));
      const pr = await prR.json().catch(() => ({}));
      const episodes = (ep?.data?.episodes || []).map((e) => ({
        id: e.id,
        summary: e.summary || e.episode || "",
        subject: e.subject || "",
        timestamp: e.timestamp,
      }));
      // get(profile) returns one profile object whose explicit_info holds the
      // extracted facts (category + description + the evidence quote).
      const profObj = (pr?.data?.profiles || [])[0];
      const facts = (profObj?.profile_data?.explicit_info || []).map((f) => ({
        category: f.category || "",
        description: f.description || "",
        evidence: f.evidence || "",
        updated_at: f.updated_at || f.created_at || null,
      }));
      return json({ ok: true, episodes, facts });
    }
    return json({ error: "unknown op (use ingest|recall|flush|dump)" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
