// ── Voice I/O ──────────────────────────────────────────────────────
// STT: Web Speech API (Chrome/Edge built-in, no keys).
// TTS: speechSynthesis. Mic level metering via WebAudio for the orb.

export const sttSupported =
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export interface ListenSession {
  stop: () => void;
}

/**
 * Push-to-talk: starts recognition + mic metering.
 * onLevel: 0..1 amplitude ~30fps. onText: final transcript (once).
 */
export async function startListening(opts: {
  onLevel: (v: number) => void;
  onInterim: (text: string) => void;
  onText: (text: string) => void;
  onError: (msg: string) => void;
}): Promise<ListenSession> {
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    opts.onError("Voice input needs Chrome or Edge.");
    return { stop: () => {} };
  }

  // mic level metering
  let audioCtx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let raf = 0;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const meter = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = (buf[i] - 128) / 128;
        sum += d * d;
      }
      opts.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      raf = requestAnimationFrame(meter);
    };
    raf = requestAnimationFrame(meter);
  } catch {
    opts.onError("Couldn't reach your microphone. Check permissions. Retry");
    return { stop: () => {} };
  }

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;

  let finalText = "";
  let done = false;

  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    opts.onInterim(finalText + interim);
  };
  rec.onerror = (e: any) => {
    if (e.error !== "aborted" && e.error !== "no-speech") opts.onError("Couldn't hear that. Retry");
  };

  const cleanup = () => {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    audioCtx?.close().catch(() => {});
    opts.onLevel(0);
  };

  rec.onend = () => {
    if (done) return;
    done = true;
    cleanup();
    const t = finalText.trim();
    if (t) opts.onText(t);
  };

  rec.start();

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

// ── TTS ────────────────────────────────────────────────────────────

let speakLevelTimer = 0;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const prefer = ["Google US English", "Microsoft Aria", "Microsoft Jenny", "Samantha"];
  for (const name of prefer) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

/** Speak text out loud. onLevel drives the orb while Ember talks. */
export function speak(text: string, onLevel?: (v: number) => void): Promise<void> {
  if (!ttsSupported) return Promise.resolve();
  stopSpeaking();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ""));
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.pitch = 1.05;

    if (onLevel) {
      // synthetic level wobble — speechSynthesis exposes no amplitude
      speakLevelTimer = window.setInterval(() => onLevel(0.35 + Math.random() * 0.4), 90);
    }
    const finish = () => {
      if (speakLevelTimer) window.clearInterval(speakLevelTimer);
      speakLevelTimer = 0;
      onLevel?.(0);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (!ttsSupported) return;
  if (speakLevelTimer) window.clearInterval(speakLevelTimer);
  speakLevelTimer = 0;
  speechSynthesis.cancel();
}
