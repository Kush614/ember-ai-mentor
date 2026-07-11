import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { prefersReducedMotion } from "../lib/motion";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../lib/auth";

export default function Login() {
  const login = useStore((s) => s.login);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    await login(email.trim(), password);
  };

  return (
    <div className="night h-full w-full flex items-center justify-center bg-twilight relative overflow-hidden field-vignette">
      <DriftingEmbers />

      <div className="relative z-10 w-[380px] text-center px-6">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 h-12 w-12 rounded-full animate-breathe motion-only"
          style={{
            background: "radial-gradient(circle at 42% 38%, #FFC46B 0%, #FF9E4A 55%, #B4552D 100%)",
            boxShadow: "0 0 28px 6px rgba(255, 158, 74, 0.45)",
          }}
        />
        <h1 className="font-display font-extrabold text-[40px] tracking-tight text-[#E9EDF7]">Ember</h1>
        <p className="mt-2 text-base text-[#E9EDF7]/60">
          A mentor that remembers you — and knows when a human can help more.
        </p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            placeholder="you@school.edu"
            autoComplete="email"
            className="w-full rounded-full bg-deepnight/80 border border-[#E9EDF7]/15 px-5 py-3 text-base text-[#E9EDF7] placeholder:text-[#E9EDF7]/30 outline-none focus:border-ember/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            placeholder="password"
            autoComplete="current-password"
            className="w-full rounded-full bg-deepnight/80 border border-[#E9EDF7]/15 px-5 py-3 text-base text-[#E9EDF7] placeholder:text-[#E9EDF7]/30 outline-none focus:border-ember/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-ember text-deepnight font-bold text-base py-3 hover:brightness-110 transition disabled:opacity-60"
          >
            {busy ? "Lighting your sky…" : "Step into your sky"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DriftingEmbers() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const fit = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    const ps = Array.from({ length: 26 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vy: 0.12 + Math.random() * 0.35,
      r: 0.8 + Math.random() * 1.8,
      a: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of ps) {
        p.y -= p.vy;
        p.x += Math.sin(p.y / 50 + p.phase) * 0.2;
        if (p.y < -8) {
          p.y = canvas.height + 8;
          p.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = p.a;
        ctx.fillStyle = "#FFC46B";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
