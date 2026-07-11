import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, setOrbLevelSink } from "../lib/store";
import { startListening, sttSupported, type ListenSession } from "../lib/voice";
import { loadHands, loadFace, detectFingers, detectFrustration } from "../lib/perception";

// ── Ember Live: the multimodal side of the seam ────────────────────
// Talk to Ember, show it your homework, draw for it, answer with your
// hands. Replaces the old memory constellation.

type Mode = "talk" | "show" | "draw" | "hands";

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "talk", label: "Talk", icon: "🎙" },
  { id: "show", label: "Show", icon: "📷" },
  { id: "draw", label: "Draw", icon: "✏️" },
  { id: "hands", label: "Hands", icon: "✋" },
];

function initialMode(): Mode {
  const m = new URLSearchParams(location.search).get("mode");
  return MODES.some((x) => x.id === m) ? (m as Mode) : "talk";
}

export default function Live() {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="relative h-full w-full overflow-hidden field-vignette flex flex-col">
      <div className="shrink-0 px-5 pt-4 flex items-center gap-2 z-10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={`h-11 rounded-full px-4 font-data text-sm transition flex items-center gap-1.5 ${
              mode === m.id
                ? "bg-ember text-deepnight font-bold"
                : "bg-deepnight/70 text-[#E9EDF7]/70 hover:text-[#E9EDF7] border border-[#E9EDF7]/10"
            }`}
          >
            <span aria-hidden="true">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative">
        {mode === "talk" && <TalkMode />}
        {mode === "show" && <ShowMode />}
        {mode === "draw" && <DrawMode />}
        {mode === "hands" && <HandsMode />}
      </div>
    </div>
  );
}

// ── Talk: push-to-talk orb, Ember answers out loud ─────────────────

function TalkMode() {
  const send = useStore((s) => s.sendMessage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const voiceEnabled = useStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useStore((s) => s.setVoiceEnabled);

  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const session = useRef<ListenSession | null>(null);

  // orb reacts while Ember speaks (TTS), in any state
  useEffect(() => {
    setOrbLevelSink(setLevel);
    return () => setOrbLevelSink(undefined);
  }, []);

  const start = async () => {
    if (listening || mentorBusy) return;
    setError("");
    setInterim("");
    setListening(true);
    if (!voiceEnabled) setVoiceEnabled(true); // talking to Ember means Ember talks back
    session.current = await startListening({
      onLevel: setLevel,
      onInterim: setInterim,
      onText: (text) => {
        setListening(false);
        setInterim("");
        send(text);
      },
      onError: (msg) => {
        setListening(false);
        setError(msg);
      },
    });
  };

  const stop = () => {
    session.current?.stop();
    setListening(false);
  };

  useEffect(() => () => session.current?.stop(), []);

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      <Orb level={level} listening={listening} />

      <div className="mt-8 min-h-[3.5rem] max-w-[420px]">
        {interim ? (
          <p className="text-lg text-[#E9EDF7]/90 leading-relaxed" aria-live="polite">
            "{interim}"
          </p>
        ) : error ? (
          <p className="text-base text-[#E9EDF7]/60">{error}</p>
        ) : (
          <p className="text-base text-[#E9EDF7]/50">
            {listening
              ? "Listening — tap the flame when you're done."
              : mentorBusy
              ? "Ember is thinking…"
              : sttSupported
              ? "Tap the flame and just ask."
              : "Voice input needs Chrome or Edge."}
          </p>
        )}
      </div>

      <button
        onClick={listening ? stop : start}
        disabled={!sttSupported || mentorBusy}
        className={`mt-2 h-12 rounded-full px-8 font-bold text-base transition ${
          listening
            ? "bg-emberhot text-deepnight"
            : "bg-ember text-deepnight hover:brightness-110 disabled:opacity-40"
        }`}
      >
        {listening ? "Done talking" : "Talk to Ember"}
      </button>

      <button
        onClick={() => setVoiceEnabled(!voiceEnabled)}
        aria-pressed={voiceEnabled}
        className={`mt-4 h-11 rounded-full px-5 font-data text-sm border transition ${
          voiceEnabled
            ? "border-ember/60 text-emberhot bg-ember/10"
            : "border-[#E9EDF7]/15 text-[#E9EDF7]/55 hover:text-[#E9EDF7]"
        }`}
      >
        {voiceEnabled ? "Ember speaks out loud · on" : "Ember speaks out loud · off"}
      </button>
    </div>
  );
}

function Orb({ level, listening }: { level: number; listening: boolean }) {
  const scale = 1 + level * 0.35;
  const glow = 24 + level * 60;
  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      className="rounded-full animate-breathe motion-only"
      style={{
        width: 148,
        height: 148,
        background: "radial-gradient(circle at 42% 38%, #FFC46B 0%, #FF9E4A 55%, #B4552D 100%)",
        boxShadow: `0 0 ${glow}px ${8 + level * 18}px rgba(255,158,74,${0.3 + level * 0.4})`,
        transform: `scale(${scale})`,
        transition: "transform 90ms ease-out, box-shadow 90ms ease-out",
        outline: listening ? "3px solid rgba(255,196,107,0.7)" : "none",
        outlineOffset: 10,
      }}
    />
  );
}

// ── shared camera hook ─────────────────────────────────────────────

function useCamera(facing: "user" | "environment") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) setError("Couldn't reach your camera. Check permissions, then retry.");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const capture = useCallback((maxW = 1024): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const scale = Math.min(1, maxW / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }, []);

  return { videoRef, ready, error, capture };
}

// ── Show: point the camera at your homework ────────────────────────

function ShowMode() {
  const sendImage = useStore((s) => s.sendImage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const { videoRef, ready, error, capture } = useCamera("environment");
  const [flash, setFlash] = useState(false);

  const snap = () => {
    const dataUrl = capture();
    if (!dataUrl) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    sendImage(dataUrl, "homework");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 gap-5">
      <div className="relative w-full max-w-[560px] aspect-video rounded-card overflow-hidden bg-deepnight border border-[#E9EDF7]/10">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-[#E9EDF7]/50 text-base">
            Opening camera…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center text-[#E9EDF7]/60 text-base">
            {error}
          </div>
        )}
      </div>

      <p className="text-base text-[#E9EDF7]/55 text-center max-w-[420px]">
        Point at your homework page and snap — Ember will read your work and find where it went sideways.
      </p>

      <button
        onClick={snap}
        disabled={!ready || mentorBusy}
        className="h-12 rounded-full bg-ember text-deepnight font-bold px-8 text-base hover:brightness-110 transition disabled:opacity-40"
      >
        {mentorBusy ? "Ember is looking…" : "Show Ember my work"}
      </button>
    </div>
  );
}

// ── Draw: whiteboard Ember can see ─────────────────────────────────

const PEN_COLORS = ["#20262E", "#FF9E4A", "#8FB4FF"];

function DrawMode() {
  const sendImage = useStore((s) => s.sendImage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [pen, setPen] = useState(PEN_COLORS[0]);
  const [erasing, setErasing] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.parentElement!.getBoundingClientRect();
    c.width = r.width * 2;
    c.height = r.height * 2;
    const ctx = c.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = erasing ? "#FFFFFF" : pen;
    ctx.lineWidth = erasing ? 26 : 4;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const up = () => (drawing.current = false);

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const check = () => {
    if (!hasInk || mentorBusy) return;
    sendImage(canvasRef.current!.toDataURL("image/png"), "whiteboard");
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-4">
      <div className="flex-1 min-h-0 rounded-card overflow-hidden shadow-day bg-white">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none cursor-crosshair"
          style={{ display: "block" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
      </div>

      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setPen(c);
              setErasing(false);
            }}
            aria-label={`Pen color ${c}`}
            className="h-11 w-11 rounded-full grid place-items-center border transition"
            style={{
              borderColor: pen === c && !erasing ? "#FF9E4A" : "rgba(233,237,247,0.15)",
              borderWidth: pen === c && !erasing ? 3 : 1,
            }}
          >
            <span className="h-6 w-6 rounded-full" style={{ background: c }} />
          </button>
        ))}
        <button
          onClick={() => setErasing(!erasing)}
          aria-pressed={erasing}
          className={`h-11 rounded-full px-4 font-data text-sm border transition ${
            erasing ? "border-ember text-emberhot bg-ember/10" : "border-[#E9EDF7]/15 text-[#E9EDF7]/60"
          }`}
        >
          Eraser
        </button>
        <button
          onClick={clear}
          className="h-11 rounded-full px-4 font-data text-sm border border-[#E9EDF7]/15 text-[#E9EDF7]/60 hover:text-[#E9EDF7] transition"
        >
          Clear
        </button>
        <button
          onClick={check}
          disabled={!hasInk || mentorBusy}
          className="ml-auto h-11 rounded-full bg-ember text-deepnight font-bold px-6 text-base hover:brightness-110 transition disabled:opacity-40"
        >
          {mentorBusy ? "Ember is looking…" : "Check my drawing"}
        </button>
      </div>
    </div>
  );
}

// ── Hands: answer with your fingers; Ember reads the room ──────────

const HOLD_MS = 1200;

function HandsMode() {
  const send = useStore((s) => s.sendMessage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const setLiveFrustration = useStore((s) => s.setLiveFrustration);
  const { videoRef, ready, error } = useCamera("user");

  const [count, setCount] = useState<number | null>(null);
  const [holdPct, setHoldPct] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const cooldownUntil = useRef(0);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let stop = false;
    let stable: number | null = null;
    let stableSince = 0;
    let lastFace = 0;

    (async () => {
      try {
        const [hands, face] = await Promise.all([loadHands(), loadFace()]);
        setLoading(false);
        const loop = () => {
          if (stop) return;
          const v = videoRef.current;
          if (v && v.videoWidth) {
            const now = performance.now();
            const n = detectFingers(hands, v, now);
            setCount(n);

            // hold a steady count to send it
            if (n !== null && n > 0 && now > cooldownUntil.current && !useStore.getState().mentorBusy) {
              if (n === stable) {
                const pct = Math.min(1, (now - stableSince) / HOLD_MS);
                setHoldPct(pct);
                if (pct >= 1) {
                  cooldownUntil.current = now + 3000;
                  setHoldPct(0);
                  stable = null;
                  send(String(n));
                }
              } else {
                stable = n;
                stableSince = now;
                setHoldPct(0);
              }
            } else {
              stable = null;
              setHoldPct(0);
            }

            // mood: 2 fps is plenty
            if (now - lastFace > 500) {
              lastFace = now;
              const f = detectFrustration(face, v, now + 0.5);
              if (f !== null) {
                setMood(f);
                setLiveFrustration(f);
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch {
        setLoading(false);
        setModelError("Couldn't load hand tracking. Check your connection, then retry.");
      }
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      setLiveFrustration(0);
    };
  }, [ready, send, setLiveFrustration, videoRef]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 gap-4">
      <div className="relative w-full max-w-[560px] aspect-video rounded-card overflow-hidden bg-deepnight border border-[#E9EDF7]/10">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover -scale-x-100" />
        {(!ready || loading) && !error && !modelError && (
          <div className="absolute inset-0 grid place-items-center text-[#E9EDF7]/50 text-base">
            {ready ? "Warming up hand tracking…" : "Opening camera…"}
          </div>
        )}
        {(error || modelError) && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center text-[#E9EDF7]/60 text-base">
            {error || modelError}
          </div>
        )}

        {count !== null && (
          <div className="absolute top-3 right-3 h-16 w-16 rounded-full bg-deepnight/85 border-2 border-ember grid place-items-center">
            <span className="font-display font-extrabold text-3xl text-emberhot">{count}</span>
            {holdPct > 0 && (
              <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="29"
                  fill="none"
                  stroke="#FFC46B"
                  strokeWidth="4"
                  strokeDasharray={`${holdPct * 182} 182`}
                />
              </svg>
            )}
          </div>
        )}
      </div>

      <p className="text-base text-[#E9EDF7]/55 text-center max-w-[440px]">
        {mentorBusy
          ? "Ember is thinking…"
          : "Hold up fingers to answer — keep them steady for a second and Ember takes it."}
      </p>

      {mood !== null && (
        <p className="font-data text-sm text-[#E9EDF7]/45">
          {mood > 0.55
            ? "Ember can tell this feels heavy — it'll go gentler."
            : "Ember can see you — everything stays on your device."}
        </p>
      )}
    </div>
  );
}
