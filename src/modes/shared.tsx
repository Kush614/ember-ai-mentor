import type { ReactNode } from "react";
import EmberDot from "../components/EmberDot";

export const MODES = [
  { key: "courses", label: "Courses", hash: "#/", emoji: "🎓" },
  { key: "mentor", label: "Mentor", hash: "#/mentor", emoji: "🔥" },
  { key: "memory", label: "Memory", hash: "#/memory", emoji: "🧠" },
  { key: "scaffold", label: "Scaffold", hash: "#/scaffold", emoji: "📚" },
  { key: "viva", label: "Viva", hash: "#/viva", emoji: "🎙️" },
  { key: "sidecar", label: "Sidecar", hash: "#/sidecar", emoji: "📖" },
  { key: "compass", label: "Compass", hash: "#/compass", emoji: "🧭" },
] as const;

const NAV_ON: Record<string, string> = {
  courses: "bg-gum-yellow",
  mentor: "bg-gum-peach",
  memory: "bg-gum-lav",
  scaffold: "bg-gum-blue",
  viva: "bg-gum-yellow",
  sidecar: "bg-gum-mint",
  compass: "bg-gum-pink",
};

export function ModeNav({ active }: { active: string }) {
  return (
    <header className="h-16 shrink-0 flex items-center px-5 gap-3 border-b-2 border-black bg-gum-cream sticky top-0 z-20">
      <a href="#/" className="flex items-center gap-2 shrink-0">
        <EmberDot size={24} />
        <span className="font-display font-extrabold text-lg tracking-tight text-black">Ember</span>
      </a>
      <nav className="ml-1 flex items-center gap-1.5 overflow-x-auto">
        {MODES.map((m) => {
          const on = m.key === active;
          return (
            <a
              key={m.key}
              href={m.hash}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap border-2 border-black text-black no-underline transition ${
                on ? `${NAV_ON[m.key] || "bg-gum-yellow"} shadow-[3px_3px_0_#000]` : "bg-white hover:-translate-y-0.5"
              }`}
            >
              <span className="mr-1" aria-hidden="true">{m.emoji}</span>
              {m.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

export function ModeShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full flex flex-col bg-morning text-ink">
      <ModeNav active={active} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          <h1 className="font-display font-extrabold text-3xl tracking-tight">{title}</h1>
          <p className="text-slate2 mt-1.5 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate2 text-sm">
      <span className="h-2 w-2 rounded-full bg-ember animate-pulse" />
      {label}
    </div>
  );
}

// EverOS memory scope per suite feature — keeps each mode's memory separate
// from the mentor's learner memory while still using the same account.
export function everosScope(feature: string, id: string): string {
  return `${feature}:${id}`;
}
