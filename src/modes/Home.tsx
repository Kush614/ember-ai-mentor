import { useState } from "react";
import { ModeNav } from "./shared";
import { lessonsByBand, BAND_STYLE, type CachedLesson } from "../lib/precache";
import { useStore } from "../lib/store";
import { STUDENTS } from "../data/students";

const AGENTS = [
  { hash: "#/mentor", emoji: "🔥", name: "Mentor", tag: "1:1 tutor", bg: "bg-gum-peach" },
  { hash: "#/scaffold", emoji: "📚", name: "Scaffold", tag: "For teachers", bg: "bg-gum-blue" },
  { hash: "#/viva", emoji: "🎙️", name: "Viva", tag: "Oral assessment", bg: "bg-gum-yellow" },
  { hash: "#/sidecar", emoji: "📖", name: "Sidecar", tag: "Reading support", bg: "bg-gum-mint" },
  { hash: "#/compass", emoji: "🧭", name: "Compass", tag: "Career paths", bg: "bg-gum-pink" },
];

const LEVELS = ["Below grade", "At grade", "Above grade"];
const LEVEL_KEY = ["below", "at", "above"];

export default function Home() {
  const learner = useStore((s) => s.learner);
  const setStudent = useStore((s) => s.setStudent);
  const bands = lessonsByBand();
  const [open, setOpen] = useState<CachedLesson | null>(null);

  return (
    <div className="h-full flex flex-col bg-gum-cream text-black">
      <ModeNav active="courses" />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1040px] mx-auto px-6 py-8">
          {/* student picker — pick a learner K-12 → HS; every agent then remembers them */}
          <div className="mb-6">
            <div className="font-display font-extrabold text-lg mb-2 text-black">
              👩‍🎓 Pick a student <span className="text-black/50 font-sans font-medium text-sm">— each agent already knows them</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {STUDENTS.map((s) => {
                const on = learner?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStudent(s.id)}
                    className={`gum shrink-0 rounded-xl px-3 py-2 text-left transition ${
                      on ? "bg-gum-yellow" : "bg-white hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{s.emoji}</span>
                      <div>
                        <div className="font-extrabold text-black leading-none">{s.name}</div>
                        <div className="text-[11px] font-bold text-black/50 mt-0.5">{s.bandLabel}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* hero */}
          <div className="gum-lg rounded-2xl bg-gum-yellow p-6 md:p-8 mb-8">
            <div className="inline-block gum rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wide mb-3">
              🎓 Ember Courses · {learner?.name ? `Hi, ${learner.name}` : "K-12 → High School"}
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.05]">
              Every math concept,
              <br />
              taught at every level.
            </h1>
            <p className="mt-3 text-black/70 max-w-xl font-medium">
              Pre-built, differentiated lessons from kindergarten to high school. Pick a course — each one is
              already saved for below, at, and above-grade students. Loads instantly.
            </p>
            <a
              href="#/about"
              className="inline-block mt-4 gum-btn rounded-full bg-black text-white px-4 py-2 text-sm font-bold no-underline"
            >
              ✦ About Ember →
            </a>
          </div>

          {/* course catalog by grade band */}
          {bands.map((b) => {
            const style = BAND_STYLE[b.grades];
            return (
              <section key={b.grades} className="mb-9">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`gum rounded-lg ${style.bg} px-3 py-1 font-display font-extrabold`}>
                    Grades {b.grades}
                  </span>
                  <span className="font-bold text-black/60">{style.label}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {b.lessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setOpen(l)}
                      className="gum gum-hover rounded-2xl bg-white text-left text-black overflow-hidden"
                    >
                      <div className={`${style.bg} border-b-2 border-black px-4 py-3 flex items-center justify-between`}>
                        <span className="font-data text-xs font-bold uppercase tracking-wide">Math · {l.grades}</span>
                        <span className="text-lg">🧮</span>
                      </div>
                      <div className="p-4">
                        <div className="font-display font-extrabold text-lg leading-tight">{l.concept}</div>
                        <p className="text-sm text-black/60 mt-1.5 font-medium line-clamp-2">{l.intro}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-black/50">3 levels · exit tickets</span>
                          <span className="gum-btn rounded-lg bg-gum-lav px-3 py-1 text-sm">Open →</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {/* agents row */}
          <h2 className="font-display font-extrabold text-2xl mb-3 mt-10">Ember agents</h2>
          <p className="text-black/60 font-medium mb-4">
            The same memory layer, five ways. Each remembers the learner as a person.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((a) => (
              <a key={a.hash} href={a.hash} className={`gum gum-hover rounded-2xl ${a.bg} p-4 block text-black no-underline`}>
                <div className="text-3xl mb-2">{a.emoji}</div>
                <div className="font-display font-extrabold text-lg leading-none">{a.name}</div>
                <div className="text-xs font-bold text-black/60 mt-1">{a.tag}</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {open && <LessonModal lesson={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function LessonModal({ lesson, onClose }: { lesson: CachedLesson; onClose: () => void }) {
  const [lvl, setLvl] = useState(0);
  const style = BAND_STYLE[lesson.grades];
  const tier = lesson.tiers[lvl] || lesson.tiers[0];
  const ticket = lesson.exit_tickets.find((t) => t.tier === LEVEL_KEY[lvl]) || lesson.exit_tickets[lvl];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start md:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="gum-lg rounded-2xl bg-white w-full max-w-[640px] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${style.bg} border-b-2 border-black px-5 py-4 flex items-start justify-between rounded-t-2xl`}>
          <div>
            <div className="font-data text-xs font-bold uppercase tracking-wide">
              Grades {lesson.grades} · {style.label}
            </div>
            <h2 className="font-display font-extrabold text-2xl leading-tight mt-0.5">{lesson.concept}</h2>
          </div>
          <button onClick={onClose} className="gum-btn rounded-lg bg-white text-black px-3 py-1 text-lg leading-none">✕</button>
        </div>

        <div className="p-5">
          <p className="font-medium text-black/80">{lesson.intro}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gum-mint">
            <span className="h-2 w-2 rounded-full bg-gum-mint border border-black" /> cached · loads instantly
          </div>

          {/* level switcher */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {LEVELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setLvl(i)}
                className={`gum-btn rounded-lg py-2 text-sm text-black ${
                  i === lvl ? "bg-gum-yellow" : "bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* tier content */}
          <div className="gum rounded-xl bg-gum-cream p-4 mt-4">
            <div className="font-display font-extrabold">{tier.level}</div>
            <p className="text-sm text-black/70 mt-1 font-medium">{tier.summary}</p>
            <p className="text-[15px] mt-3">{tier.activity}</p>
          </div>

          {ticket && (
            <div className="gum rounded-xl bg-gum-lav/40 p-4 mt-3">
              <div className="text-xs font-extrabold uppercase tracking-wide text-black/60">Exit ticket</div>
              <p className="text-[15px] mt-1 font-medium">{ticket.question}</p>
            </div>
          )}

          {lesson.misconception && (
            <div className="gum rounded-xl bg-gum-pink/30 p-4 mt-3">
              <div className="text-xs font-extrabold uppercase tracking-wide text-black/60">⚠️ Common misconception</div>
              <p className="text-[15px] mt-1 font-medium">{lesson.misconception}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
