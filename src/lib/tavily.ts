// ── Tavily client (via the Butterbase `tavily` function) ──────────
// Returns null when Tavily isn't configured yet, so Compass can fall back
// to model knowledge and just flag that live data is off.

import { config } from "./config";

const FN_URL = config.butterbaseUrl ? `${config.butterbaseUrl}/fn/tavily` : "";
export const tavilyReady = !!FN_URL;

export interface JobResult {
  title: string;
  url: string;
  content: string;
}

export async function searchJobs(query: string, maxResults = 6): Promise<JobResult[] | null> {
  if (!FN_URL) return null;
  try {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, max_results: maxResults }),
    });
    const d = await res.json();
    if (!d?.ok || !Array.isArray(d.results) || !d.results.length) return null;
    return d.results as JobResult[];
  } catch (e) {
    console.warn("[Ember] Tavily search failed:", e);
    return null;
  }
}
