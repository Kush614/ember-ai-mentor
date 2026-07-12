import { useEffect, useState } from "react";
import katex from "katex";
import { celebrate } from "../lib/celebrate";
import { serpImages, serpVideos, youtubeId } from "../lib/serp";

type Seg =
  | { type: "text"; value: string }
  | { type: "svg"; value: string }
  | { type: "mathblock"; value: string } // $$ ... $$ display formula
  | { type: "img"; value: string } // AI-generated illustration
  | { type: "photo"; value: string } // real Google image
  | { type: "video"; value: string }
  | { type: "celebrate"; value: string };

const PATTERNS: { type: Seg["type"]; re: RegExp }[] = [
  { type: "svg", re: /```svg\s*([\s\S]*?)```/ },
  { type: "mathblock", re: /\$\$([\s\S]*?)\$\$/ },
  { type: "img", re: /\[\[img:\s*([^\]]+)\]\]/i },
  { type: "photo", re: /\[\[photo:\s*([^\]]+)\]\]/i },
  { type: "video", re: /\[\[video:\s*([^\]]+)\]\]/i },
  { type: "celebrate", re: /\[\[celebrate\]\]/i },
];

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex.trim(), { displayMode: display, throwOnError: false });
  } catch {
    return tex;
  }
}

// Render a text run with inline $...$ math flowing inside it.
function TextWithMath({ text }: { text: string }) {
  const parts = text.split(/(\$[^$\n]+?\$)/g);
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        p.startsWith("$") && p.endsWith("$") && p.length > 2 ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(p.slice(1, -1), false) }} />
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

function parseRich(content: string): Seg[] {
  const parts: Seg[] = [];
  let rest = content;
  for (let i = 0; i < 40 && rest.length; i++) {
    let best: { type: Seg["type"]; m: RegExpExecArray } | null = null;
    for (const p of PATTERNS) {
      const m = p.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { type: p.type, m };
    }
    if (!best) {
      parts.push({ type: "text", value: rest });
      break;
    }
    if (best.m.index > 0) parts.push({ type: "text", value: rest.slice(0, best.m.index) });
    parts.push({ type: best.type, value: (best.m[1] || "").trim() });
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return parts;
}

export function stripMedia(content: string): string {
  return content
    .replace(/```svg[\s\S]*?```/gi, "")
    .replace(/```svg[\s\S]*$/i, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$\$[\s\S]*$/g, "")
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[[^\]]*$/g, "")
    .trimEnd();
}

function cleanSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}

function pollImg(desc: string, w = 480, h = 300): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(desc)}?width=${w}&height=${h}&nologo=true`;
}

const skeleton = "bg-cloud animate-pulse";

// AI-generated illustration (Pollinations), or real Google image when photo=true.
function MediaImage({ query, google }: { query: string; google: boolean }) {
  const [src, setSrc] = useState<string>(google ? "" : pollImg(query));

  useEffect(() => {
    if (!google) {
      setSrc(pollImg(query));
      return;
    }
    let alive = true;
    serpImages(query).then((r) => {
      if (!alive) return;
      setSrc(r?.[0]?.original || pollImg(query)); // real Google image, else fall back to generated
    });
    return () => {
      alive = false;
    };
  }, [query, google]);

  return (
    <figure className="my-1">
      <img
        src={src || pollImg(query)}
        alt={query}
        loading="lazy"
        onError={(e) => ((e.currentTarget as HTMLImageElement).src = pollImg(query))}
        className={`rounded-xl border border-ink/10 w-full max-w-[440px] ${src ? "" : skeleton}`}
        style={{ aspectRatio: "480 / 300", objectFit: "cover" }}
      />
      <figcaption className="text-xs text-slate2 mt-1">
        {google ? "📷 " : "🎨 "}
        {query}
      </figcaption>
    </figure>
  );
}

// Real Google/YouTube video (SerpAPI). Embeds YouTube; else a link card. Falls
// back to a YouTube search card when SerpAPI isn't configured.
function MediaVideo({ query }: { query: string }) {
  const [vid, setVid] = useState<{ title: string; link: string; thumbnail: string; duration?: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    serpVideos(query).then((r) => {
      if (!alive) return;
      setVid(r?.[0] || null);
      setDone(true);
    });
    return () => {
      alive = false;
    };
  }, [query]);

  if (!done) {
    return <div className={`my-1 max-w-[440px] rounded-xl ${skeleton}`} style={{ aspectRatio: "16 / 9" }} />;
  }

  const id = vid ? youtubeId(vid.link) : null;
  if (vid && id) {
    return (
      <div className="my-1 max-w-[440px]">
        <div className="rounded-xl overflow-hidden border border-ink/10" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={vid.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <div className="text-xs text-slate2 mt-1 truncate">▶ {vid.title}</div>
      </div>
    );
  }

  const link = vid?.link || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const thumb = vid?.thumbnail || pollImg(`${query}, educational video thumbnail, vibrant`, 440, 248);
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="block my-1 max-w-[440px] rounded-xl overflow-hidden border border-ink/10 group no-underline text-inherit"
    >
      <div className="relative">
        <img src={thumb} alt="" loading="lazy" className="w-full bg-cloud" style={{ aspectRatio: "16 / 9", objectFit: "cover" }} />
        <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/10 transition">
          <span className="h-12 w-12 grid place-items-center rounded-full bg-red-600 text-white text-xl shadow-lg">▶</span>
        </div>
      </div>
      <div className="px-3 py-2 bg-white flex items-center gap-2">
        <span className="text-red-600 font-bold text-sm">▶ Watch</span>
        <span className="text-sm text-ink truncate">{vid?.title || query}</span>
      </div>
    </a>
  );
}

export default function RichMessage({ content }: { content: string }) {
  const segs = parseRich(content);
  const hasCelebrate = segs.some((s) => s.type === "celebrate");

  useEffect(() => {
    if (hasCelebrate) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCelebrate]);

  return (
    <div className="space-y-2">
      {segs.map((s, i) => {
        if (s.type === "text") {
          if (!s.value.trim()) return null;
          return <TextWithMath key={i} text={s.value.trim()} />;
        }
        if (s.type === "mathblock") {
          return (
            <div
              key={i}
              className="my-2 overflow-x-auto text-[17px]"
              dangerouslySetInnerHTML={{ __html: renderMath(s.value, true) }}
            />
          );
        }
        if (s.type === "svg") {
          return (
            <div
              key={i}
              className="rounded-xl border border-ink/10 bg-white p-3 my-1 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: cleanSvg(s.value) }}
            />
          );
        }
        if (s.type === "img") return <MediaImage key={i} query={s.value} google={false} />;
        if (s.type === "photo") return <MediaImage key={i} query={s.value} google={true} />;
        if (s.type === "video") return <MediaVideo key={i} query={s.value} />;
        return null; // celebrate: side-effect only
      })}
    </div>
  );
}
