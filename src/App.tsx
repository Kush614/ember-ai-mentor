import { useEffect, useState } from "react";
import { useStore } from "./lib/store";
import Login from "./components/Login";
import Chat from "./components/Chat";
import Live from "./components/Live";
import Teacher from "./components/Teacher";
import Reset from "./components/Reset";
import EmberDot from "./components/EmberDot";
import Home from "./modes/Home";
import MemoryReveal from "./modes/MemoryReveal";
import Scaffold from "./modes/Scaffold";
import Viva from "./modes/Viva";
import Sidecar from "./modes/Sidecar";
import Compass from "./modes/Compass";
import { llmMode, everosMode, backendMode } from "./lib/config";

function getRoute(): string {
  const h = location.hash.replace(/^#\/?/, "");
  return h ? `/${h}` : location.pathname;
}

function useRoute(): string {
  const [route, setRoute] = useState(getRoute());
  useEffect(() => {
    const on = () => setRoute(getRoute());
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", on);
    return () => {
      window.removeEventListener("hashchange", on);
      window.removeEventListener("popstate", on);
    };
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const learner = useStore((s) => s.learner);
  const login = useStore((s) => s.login);

  // stage convenience: ?auto skips the login click
  useEffect(() => {
    if (!learner && location.search.includes("auto")) login();
  }, [learner, login]);

  if (route === "/teach") return <Teacher />;
  if (route === "/reset") return <Reset />;
  if (!learner) return <Login />;

  // Ember suite (all reuse Butterbase auth + EverOS memory + Claude proxy)
  if (route === "/mentor") return <StudentHome />;
  if (route === "/memory") return <MemoryReveal />;
  if (route === "/scaffold") return <Scaffold />;
  if (route === "/viva") return <Viva />;
  if (route === "/sidecar") return <Sidecar />;
  if (route === "/compass") return <Compass />;
  return <Home />; // "/" and "/home" → Gumroad Canvas course dashboard
}

function StudentHome() {
  return (
    <div className="flex flex-col h-full bg-morning">
      <div className="flex-1 min-h-0 flex">
        {/* ── Daylight ── */}
        <section className="min-h-0 flex flex-col" style={{ width: "55%" }}>
          <DaylightHeader />
          <Chat />
        </section>

        {/* ── The seam ── */}
        <div className="seam" aria-hidden="true" />

        {/* ── Ember Live ── */}
        <section className="night min-h-0 flex-1 bg-twilight">
          <Live />
        </section>
      </div>
      <DirectorBar />
    </div>
  );
}

function DaylightHeader() {
  const learner = useStore((s) => s.learner);
  const entries = useStore((s) => s.entries);
  const streak = entries.filter((e) => e.type === "session").length + 1;

  return (
    <header className="h-16 shrink-0 flex items-center px-6 gap-3 border-b border-ink/[0.07]">
      <EmberDot size={26} />
      <span className="font-display font-bold text-xl tracking-tight text-ink">Ember</span>
      <a
        href="#/"
        className="ml-3 text-sm font-bold text-ink border-2 border-ink rounded-lg px-2.5 py-1 hover:-translate-y-0.5 transition"
      >
        🎓 Courses
      </a>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <span className="font-bold text-ink">{learner?.name}</span>
        <span className="text-slate2">·</span>
        <span className="font-data text-slate2">
          streak <span aria-hidden="true">🔥</span>
          <span className="text-ink font-medium">{streak}</span>
        </span>
      </div>
    </header>
  );
}

// Demo stage safety net — collapsed and quiet, never part of the product.
function DirectorBar() {
  const resetDemo = useStore((s) => s.resetDemo);
  const forceRule = useStore((s) => s.forceRule);
  const logout = useStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 border-t border-ink/[0.06] bg-cloud/60 px-4 py-1 flex items-center gap-3 text-[11px] font-data text-slate2/80">
      <button onClick={() => setOpen((o) => !o)} className="hover:text-ink rounded-full px-1">
        director {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="flex items-center gap-2 flex-wrap">
          <Btn onClick={() => forceRule("ask_teacher")}>3-fail handoff</Btn>
          <Btn onClick={() => forceRule("take_break")}>break</Btn>
          <Btn onClick={() => forceRule("help_peer")}>peer-match</Btn>
          <Btn onClick={() => forceRule("review_nudge")}>decay</Btn>
          <Btn onClick={() => resetDemo()}>reset demo</Btn>
          <Btn onClick={() => logout()}>logout</Btn>
          <Btn onClick={() => (location.hash = "#/teach")}>teacher view</Btn>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Badge label="llm" mode={llmMode} />
        <Badge label="memory" mode={everosMode} />
        <Badge label="backend" mode={backendMode} />
      </div>
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-ink/10 bg-morning px-2.5 py-0.5 hover:bg-white hover:text-ink transition"
    >
      {children}
    </button>
  );
}

function Badge({ label, mode }: { label: string; mode: string }) {
  const live = mode !== "mock";
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-moss" : "bg-slate2/40"}`} />
      {label}:{mode}
    </span>
  );
}
