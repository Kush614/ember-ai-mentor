import { useEffect, useState } from "react";
import { ModeShell, Spinner, everosScope } from "./shared";
import { completeJSON } from "../lib/llm";
import { recall, ingestExchange } from "../lib/everos";
import { useStore } from "../lib/store";
import { getStudent } from "../data/students";

type ProfileKey = "dyslexia" | "ell" | "adhd";
const PROFILES: { key: ProfileKey; label: string; hint: string }[] = [
  { key: "dyslexia", label: "Dyslexia-friendly", hint: "chunked text, generous spacing, readable type" },
  { key: "ell", label: "English learner", hint: "pre-taught vocabulary in plain words" },
  { key: "adhd", label: "Focus / reduced-stimulus", hint: "one chunk at a time, minimal clutter" },
];

interface Adapted {
  chunks: { heading: string; text: string; check: string }[];
  vocabulary: { word: string; meaning: string }[];
  reading_time_min: number;
}

export default function Sidecar() {
  const learner = useStore((s) => s.learner);
  const learnerId = learner?.id || "guest";
  const scope = learnerId; // one shared memory per student across all agents
  const student = getStudent(learnerId);

  const acc = student?.accommodations || [];
  const [profile, setProfile] = useState<Record<ProfileKey, boolean>>({
    dyslexia: acc.includes("dyslexia") || acc.length === 0,
    ell: acc.includes("ell"),
    adhd: acc.includes("adhd"),
  });
  const [text, setText] = useState(
    "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll. During this process, plants take in carbon dioxide and water and, using energy from sunlight, convert them into glucose and oxygen."
  );
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Adapted | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [err, setErr] = useState("");

  // Recall the student's accommodation profile and pre-select it.
  useEffect(() => {
    recall(scope, "reading accommodations and adaptations that help this student").then((r) => {
      const joined = r.profiles.join(" ").toLowerCase();
      if (joined) {
        setProfile((p) => ({
          dyslexia: /dyslex/.test(joined) || p.dyslexia,
          ell: /english learner|ell|vocabulary/.test(joined) || p.ell,
          adhd: /adhd|focus|reduced/.test(joined) || p.adhd,
        }));
      }
    });
  }, [scope]);

  const active = PROFILES.filter((p) => profile[p.key]);

  async function adapt() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr("");
    setOut(null);
    setFocusIdx(0);

    const needs = active.map((p) => p.label).join(", ") || "general readability";
    const wantVocab = profile.ell;
    const sys = `You are Sidecar, an assistive reading companion for students with learning differences. Restructure the passage for these needs: ${needs}.
- Break it into 2-5 short, clearly-headed chunks. Simplify sentences without dumbing down the content.
- Each chunk gets a one-line comprehension check.
${wantVocab ? "- Provide 3-6 vocabulary words pre-taught in plain, simple language." : "- vocabulary can be an empty array."}
Respond ONLY with JSON:
{"chunks":[{"heading":"","text":"","check":""}],"vocabulary":[{"word":"","meaning":""}],"reading_time_min":0}`;

    const res = await completeJSON<Adapted>(sys, text, 1800);
    if (!res?.chunks?.length) {
      setErr("Couldn't adapt the passage (LLM unavailable). Try again in a moment.");
      setBusy(false);
      return;
    }
    setOut(res);
    setBusy(false);

    // Remember this student's chosen accommodations.
    ingestExchange(
      scope,
      "reader",
      `I read with these accommodations: ${needs}.`,
      `Adapted a passage using ${needs}. This student prefers ${needs}.`
    );
  }

  const dysStyle = profile.dyslexia
    ? { letterSpacing: "0.03em", wordSpacing: "0.14em", lineHeight: 1.9 as any }
    : {};

  const chunks = out?.chunks || [];
  const shown = profile.adhd && out ? [chunks[focusIdx]].filter(Boolean) : chunks;

  return (
    <ModeShell
      active="sidecar"
      title="Sidecar"
      subtitle="Paste any reading. Sidecar reshapes it to how you read best — and remembers your accommodations for next time."
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {PROFILES.map((p) => (
          <button
            key={p.key}
            onClick={() => setProfile((s) => ({ ...s, [p.key]: !s[p.key] }))}
            title={p.hint}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${
              profile[p.key]
                ? "bg-ink text-morning border-ink"
                : "bg-white text-slate2 border-ink/15 hover:border-ink/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste a reading assignment…"
        className="w-full rounded-card border border-ink/10 bg-white px-4 py-3 outline-none focus:border-ember/60 resize-none font-sans"
      />
      <button
        onClick={adapt}
        disabled={busy}
        className="mt-4 rounded-full bg-ink text-morning font-bold px-6 py-3 hover:brightness-110 transition disabled:opacity-50"
      >
        {busy ? "Adapting…" : "Adapt this reading"}
      </button>
      {busy && <div className="mt-3"><Spinner label="Reshaping the text for how you read…" /></div>}
      {err && <p className="mt-3 text-cinder text-sm">{err}</p>}

      {out && (
        <div className="mt-7 grid lg:grid-cols-[1fr_260px] gap-6 animate-fade-up">
          <div>
            {profile.ell && out.vocabulary?.length > 0 && (
              <div className="mb-4 rounded-card border border-starblue/40 bg-starblue/[0.06] p-4">
                <div className="font-display font-bold mb-2">Words to know first</div>
                <dl className="space-y-1.5 text-sm">
                  {out.vocabulary.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <dt className="font-bold text-ink shrink-0">{v.word}</dt>
                      <dd className="text-slate2">— {v.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="space-y-4">
              {shown.map((c, i) => (
                <div key={i} className="rounded-card border border-ink/10 bg-white p-5">
                  <h3 className="font-display font-bold text-lg mb-2">{c.heading}</h3>
                  <p className="text-ink font-sans" style={dysStyle}>
                    {c.text}
                  </p>
                  <div className="mt-3 pt-3 border-t border-ink/[0.07] text-sm text-slate2">
                    <span className="font-semibold text-ink/70">Check: </span>
                    {c.check}
                  </div>
                </div>
              ))}
            </div>

            {profile.adhd && out && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setFocusIdx((i) => Math.max(0, i - 1))}
                  disabled={focusIdx === 0}
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm disabled:opacity-40"
                >
                  ← Back
                </button>
                <span className="text-sm text-slate2 font-data">
                  {focusIdx + 1} / {chunks.length}
                </span>
                <button
                  onClick={() => setFocusIdx((i) => Math.min(chunks.length - 1, i + 1))}
                  disabled={focusIdx >= chunks.length - 1}
                  className="rounded-full bg-ink text-morning px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          <aside className="text-sm">
            <div className="rounded-card bg-cloud/70 border border-ink/[0.06] p-4">
              <div className="font-data text-slate2">~{out.reading_time_min || Math.max(1, Math.round(chunks.length * 1.5))} min read</div>
              <div className="mt-2 text-slate2">Adapted for:</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {active.length ? (
                  active.map((p) => (
                    <span key={p.key} className="text-xs bg-white border border-ink/10 rounded-full px-2 py-0.5">
                      {p.label}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate2">general readability</span>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </ModeShell>
  );
}
