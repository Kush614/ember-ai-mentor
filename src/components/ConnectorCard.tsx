import { useEffect, useRef, useState } from "react";
import type { ConnectorCard as Card } from "../types";
import { useStore } from "../lib/store";

// The only allowed inversion: twilight on the daylight side, signaling
// "this came from Ember noticing, not from the chat."

const ARTIFACT_LABEL: Record<string, string> = {
  ask_teacher: "Your question, ready to go",
  take_break: "Note for a grown-up",
  help_peer: "Message for your classmate",
  review_nudge: "",
};

const COPY_LABEL: Record<string, string> = {
  ask_teacher: "Copy question",
  take_break: "Copy note",
  help_peer: "Copy message",
};

function PersonStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.5 L14.2 9.8 L22.5 12 L14.2 14.2 L12 22.5 L9.8 14.2 L1.5 12 L9.8 9.8 Z"
        fill="#8FB4FF"
        style={{ filter: "drop-shadow(0 0 6px #8FB4FF)" }}
      />
    </svg>
  );
}

export default function ConnectorCard({ msgId, card }: { msgId: string; card: Card }) {
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const copyLabel = COPY_LABEL[card.type] || "Copy question";
  const canRecordVideo = card.type === "ask_teacher" && !!card.handoff_artifact;

  return (
    <div className="animate-card-rise my-2" aria-live="polite">
      <div className="rounded-card bg-twilight text-[#E9EDF7] p-5 shadow-[0_8px_32px_rgba(12,16,38,0.35)]">
        <div className="flex items-start gap-3 mb-2">
          <PersonStar className="h-7 w-7 shrink-0 mt-0.5" />
          <h3 className="font-display font-bold text-xl leading-snug tracking-tight">
            {card.headline}
          </h3>
        </div>

        <p className="text-base leading-relaxed text-[#E9EDF7]/85">{card.message_to_student}</p>

        {card.handoff_artifact && (
          <div className="mt-4 rounded-card bg-deepnight/80 border border-starblue/20 p-4">
            {ARTIFACT_LABEL[card.type] && (
              <div className="text-xs uppercase tracking-wider text-starblue/80 font-bold mb-2">
                {ARTIFACT_LABEL[card.type]}
              </div>
            )}
            <p className="text-[15px] leading-relaxed text-white">
              {card.handoff_artifact}
            </p>

            {card.video ? (
              <div className="mt-3">
                <video src={card.video} controls className="w-full rounded-xl" />
                <p className="mt-1.5 font-data text-xs text-moss">Video attached — your teacher will see it</p>
              </div>
            ) : recording && canRecordVideo ? (
              <VideoRecorder
                onDone={(dataUrl) => {
                  useStore.getState().attachVideo(msgId, dataUrl);
                  setRecording(false);
                }}
                onCancel={() => setRecording(false)}
              />
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(card.handoff_artifact || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="flex-1 rounded-full bg-ember text-black font-extrabold text-base py-3 border-2 border-black/15 hover:brightness-110 transition"
                >
                  {copied ? "✓ Copied" : `📋 ${copyLabel}`}
                </button>
                {canRecordVideo && (
                  <button
                    onClick={() => setRecording(true)}
                    className="flex-1 rounded-full border border-starblue/40 text-starblue font-bold text-base py-3 hover:bg-starblue/10 transition"
                  >
                    Record it as a video
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 20-second video message, straight into the teacher's inbox ─────

const MAX_SECONDS = 20;

function VideoRecorder({ onDone, onCancel }: { onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [preview, setPreview] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      } catch {
        setError("Couldn't reach your camera or mic. Check permissions, then retry.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state]);

  const start = () => {
    if (!streamRef.current) return;
    chunks.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: pickMime() });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: rec.mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
        setState("preview");
      };
      reader.readAsDataURL(blob);
    };
    recRef.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
  };

  const stop = () => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  };

  return (
    <div className="mt-3">
      {error ? (
        <p className="text-sm text-[#E9EDF7]/60">{error}</p>
      ) : state === "preview" ? (
        <>
          <video src={preview} controls className="w-full rounded-xl" />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onDone(preview)}
              className="flex-1 rounded-full bg-ember text-deepnight font-bold text-base py-3 hover:brightness-110 transition"
            >
              Send to teacher
            </button>
            <button
              onClick={() => {
                setPreview("");
                setState("idle");
              }}
              className="flex-1 rounded-full border border-[#E9EDF7]/20 text-[#E9EDF7]/70 text-base py-3 hover:bg-white/5 transition"
            >
              Try again
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative rounded-xl overflow-hidden bg-deepnight">
            <video ref={videoRef} playsInline className="w-full -scale-x-100" />
            {state === "recording" && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-deepnight/80 px-2.5 py-1 font-data text-xs text-[#E9EDF7]">
                <span className="h-2 w-2 rounded-full bg-cinder animate-pulse" />
                {MAX_SECONDS - seconds}s left
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            {state === "recording" ? (
              <button
                onClick={stop}
                className="flex-1 rounded-full bg-emberhot text-deepnight font-bold text-base py-3 transition"
              >
                Stop recording
              </button>
            ) : (
              <button
                onClick={start}
                className="flex-1 rounded-full bg-ember text-deepnight font-bold text-base py-3 hover:brightness-110 transition"
              >
                Start recording
              </button>
            )}
            <button
              onClick={onCancel}
              className="rounded-full border border-[#E9EDF7]/20 text-[#E9EDF7]/70 text-base py-3 px-5 hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function pickMime(): string {
  const options = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  for (const m of options) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
