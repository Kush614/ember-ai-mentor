// ── Media search (via the Butterbase `tavily` function) ──────────
// Real images (Tavily include_images) + real videos (filter web results for
// YouTube). Returns null when unavailable so RichMessage falls back to its
// generated media.

import { config } from "./config";

const FN_URL = config.butterbaseUrl ? `${config.butterbaseUrl}/fn/tavily` : "";
export const serpReady = !!FN_URL;

export interface ImgResult {
  original: string;
  thumbnail: string;
  title: string;
  link: string;
}
export interface VidResult {
  title: string;
  link: string;
  thumbnail: string;
  duration: string;
  source: string;
}

async function tavily(body: Record<string, any>): Promise<any | null> {
  if (!FN_URL) return null;
  try {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    return d?.ok ? d : null;
  } catch (e) {
    console.warn("[Ember] media search failed:", e);
    return null;
  }
}

export async function serpImages(q: string): Promise<ImgResult[] | null> {
  const d = await tavily({ query: q, include_images: true, max_results: 4 });
  const imgs = (d?.images || []).filter((i: any) => i.url);
  if (!imgs.length) return null;
  return imgs.map((i: any) => ({ original: i.url, thumbnail: i.url, title: i.description || q, link: i.url }));
}

export async function serpVideos(q: string): Promise<VidResult[] | null> {
  const d = await tavily({ query: `${q} explainer video youtube`, max_results: 8 });
  const yt = (d?.results || []).filter((r: any) => youtubeId(r.url || ""));
  if (!yt.length) return null;
  return yt.map((r: any) => {
    const id = youtubeId(r.url)!;
    return {
      title: r.title || q,
      link: r.url,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration: "",
      source: "YouTube",
    };
  });
}

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}
