// Butterbase serverless function: Tavily web-search proxy for Compass.
// Holds TAVILY_API_KEY server-side. Returns {ok:false} gracefully when the
// key isn't set yet, so Compass falls back to model knowledge.
//
// Deployed at: https://api.butterbase.ai/v1/{app_id}/fn/tavily

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
    new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...ch } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const key = ctx?.env?.TAVILY_API_KEY;
  if (!key) return json({ ok: false, error: "no_key", results: [] });

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  const { query, max_results, include_images } = body || {};
  if (!query) return json({ ok: false, error: "query required" }, 400);

  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: max_results || 6,
        search_depth: "basic",
        include_images: !!include_images,
        include_image_descriptions: !!include_images,
      }),
    });
    const d = await r.json().catch(() => ({}));
    const results = (d.results || []).map((x) => ({
      title: x.title || "",
      url: x.url || "",
      content: (x.content || "").slice(0, 500),
    }));
    const images = (d.images || []).map((x) =>
      typeof x === "string" ? { url: x, description: "" } : { url: x.url || "", description: x.description || "" }
    );
    return json({ ok: r.ok, results, images });
  } catch (e) {
    return json({ ok: false, error: String(e), results: [], images: [] }, 502);
  }
}
