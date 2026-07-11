// ── On-device perception (MediaPipe) ───────────────────────────────
// Hand tracking → answer with your fingers. Face blendshapes → live
// frustration signal for the Observer. Everything runs locally in the
// browser; no frames ever leave the device.

import type { HandLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

let handsPromise: Promise<HandLandmarker> | null = null;
let facePromise: Promise<FaceLandmarker> | null = null;

export function loadHands(): Promise<HandLandmarker> {
  if (!handsPromise) {
    handsPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
      });
    })();
    handsPromise.catch(() => (handsPromise = null));
  }
  return handsPromise;
}

export function loadFace(): Promise<FaceLandmarker> {
  if (!facePromise) {
    facePromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        numFaces: 1,
      });
    })();
    facePromise.catch(() => (facePromise = null));
  }
  return facePromise;
}

type Pt = { x: number; y: number; z: number };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Count extended fingers on one hand's 21 landmarks (orientation-tolerant). */
function countHand(lm: Pt[]): number {
  const wrist = lm[0];
  let count = 0;
  // index / middle / ring / pinky: tip further from wrist than pip → extended
  const fingers: [number, number][] = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  for (const [tip, pip] of fingers) {
    if (dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.15) count++;
  }
  // thumb: tip further from pinky-base than thumb-ip → out to the side
  if (dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * 1.08) count++;
  return count;
}

/** Total fingers held up across all visible hands, or null if no hands. */
export function detectFingers(hands: HandLandmarker, video: HTMLVideoElement, ts: number): number | null {
  const res = hands.detectForVideo(video, ts);
  if (!res.landmarks?.length) return null;
  return res.landmarks.reduce((sum, lm) => sum + countHand(lm as Pt[]), 0);
}

/** Frustration proxy 0..1 from face blendshapes, or null if no face. */
export function detectFrustration(face: FaceLandmarker, video: HTMLVideoElement, ts: number): number | null {
  const res = face.detectForVideo(video, ts);
  const shapes = res.faceBlendshapes?.[0]?.categories;
  if (!shapes) return null;
  const get = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  const browDown = (get("browDownLeft") + get("browDownRight")) / 2;
  const press = (get("mouthPressLeft") + get("mouthPressRight")) / 2;
  const squint = (get("eyeSquintLeft") + get("eyeSquintRight")) / 2;
  return Math.max(0, Math.min(1, browDown * 1.3 + press * 0.5 + squint * 0.3));
}
