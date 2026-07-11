// Butterbase serverless function: transparent Anthropic (Claude) proxy.
// Keeps ANTHROPIC_API_KEY server-side. The browser sends a normal Anthropic
// Messages API body (model, max_tokens, stream, system, messages) and this
// forwards it to api.anthropic.com, streaming the response straight back.
//
// Deployed at: https://api.butterbase.ai/v1/{app_id}/fn/claude  (auth: required)

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

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { "content-type": "application/json", ...ch },
    });

  const key = ctx?.env?.ANTHROPIC_API_KEY;
  if (!key)
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { "content-type": "application/json", ...ch },
    });

  const bodyText = await req.text(); // pass the Anthropic request through verbatim

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: bodyText,
  });

  // Stream the response body straight back (works for both stream and JSON).
  const headers = new Headers(ch);
  headers.set("content-type", upstream.headers.get("content-type") || "application/json");
  return new Response(upstream.body, { status: upstream.status, headers });
}
