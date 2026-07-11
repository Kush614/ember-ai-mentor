// Butterbase serverless function: SerpAPI proxy for real Google Images +
// Google Videos. Holds SERPAPI_KEY server-side. Returns {ok:false} gracefully
// when the key isn't set, so RichMessage falls back to its default media.
//
// Deployed at: https://api.butterbase.ai/v1/{app_id}/fn/serp
// Body: { type: "images" | "videos", q: "search phrase" }

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

  const key = ctx?.env?.SERPAPI_KEY;
  if (!key) return json({ ok: false, error: "no_key", results: [] });

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  const { type, q } = body || {};
  if (!q) return json({ ok: false, error: "q required" }, 400);

  const engine = type === "videos" ? "google_videos" : "google_images";
  const url = `https://serpapi.com/search.json?engine=${engine}&q=${encodeURIComponent(
    q
  )}&safe=active&num=8&api_key=${key}`;

  try {
    const d = await (await fetch(url)).json();
    let results;
    if (type === "videos") {
      results = (d.video_results || []).slice(0, 4).map((v) => ({
        title: v.title || "",
        link: v.link || "",
        thumbnail: v.thumbnail || "",
        duration: v.duration || "",
        source: v.source || "",
      }));
    } else {
      results = (d.images_results || [])
        .slice(0, 8)
        .map((i) => ({ title: i.title || "", original: i.original || i.thumbnail || "", thumbnail: i.thumbnail || "", link: i.link || "" }))
        .filter((i) => i.original);
    }
    return json({ ok: true, results, error: d.error || null });
  } catch (e) {
    return json({ ok: false, error: String(e), results: [] }, 502);
  }
}
