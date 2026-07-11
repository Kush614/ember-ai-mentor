import { create } from "zustand";
import type { MemoryEntry, ChatMessage, ObserverResult, ConnectorCard, ConnectorType } from "../types";
import { LEARNER, SESSION_ID } from "../data/seed";
import { getStudent } from "../data/students";
import { loadMemories, upsertMemory, makeEntry, resetLearner, NOW } from "./memory";
import { saveTranscript, logConnectorEvent, resetBackend, attachVideoToLastEvent } from "./backend";
import { buildDigest, bestModality } from "./digest";
import { mentorSystem } from "./prompts";
import { mentorStream, runObserver, runConnector, runVision } from "./llm";
import { speak, stopSpeaking } from "./voice";
import { authenticate, logout as authLogout, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, type AuthUser } from "./auth";
import { recall as everosRecall, ingestExchange, formatRecall } from "./everos";
import {
  emptyTracker,
  updateTracker,
  checkExchangeRules,
  checkDecayRule,
  type SessionTracker,
  type FiredRule,
} from "./connector";

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface EmberState {
  learner: { id: string; name: string; grade: string } | null;
  authUser: AuthUser | null;
  entries: MemoryEntry[];
  messages: ChatMessage[];
  tracker: SessionTracker;
  mentorBusy: boolean;
  observerBusy: boolean;

  // multimodal
  voiceEnabled: boolean; // Ember speaks replies out loud
  liveFrustration: number; // 0..1 from webcam face reading (0 = off/calm)

  login: (email?: string, password?: string) => Promise<void>;
  setStudent: (id: string) => Promise<void>;
  logout: () => void;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (dataUrl: string, kind: "homework" | "whiteboard", caption?: string) => Promise<void>;
  setVoiceEnabled: (on: boolean) => void;
  setLiveFrustration: (v: number) => void;
  attachVideo: (msgId: string, videoDataUrl: string) => void;
  resetDemo: () => Promise<void>;
  forceRule: (type: ConnectorType) => Promise<void>;
}

let loginInFlight = false;

export const useStore = create<EmberState>((set, get) => ({
  learner: null,
  authUser: null,
  entries: [],
  messages: [],
  tracker: emptyTracker(),
  mentorBusy: false,
  observerBusy: false,
  voiceEnabled: false,
  liveFrustration: 0,

  async login(email, password) {
    if (loginInFlight || get().learner) return;
    loginInFlight = true;

    // Real Butterbase auth (JWT). Never let an auth hiccup block the demo:
    // authenticate() signs up on first login and mock-falls-back when unconfigured.
    let authUser: AuthUser | null = null;
    try {
      authUser = await authenticate(email || DEMO_EMAIL, password || DEMO_PASSWORD, DEMO_NAME);
    } catch (e) {
      console.warn("[Ember] auth failed, continuing in demo mode:", e);
    }

    const entries = await loadMemories(LEARNER.id);
    set({
      learner: { id: LEARNER.id, name: LEARNER.display_name, grade: LEARNER.grade },
      authUser,
      entries,
      messages: [],
      tracker: emptyTracker(),
    });

    // Zero onboarding: Ember greets by name, with context, unprompted.
    setTimeout(() => streamGreeting(set, get), 1000);

    // Rule 4 (decay) fires shortly after login.
    setTimeout(async () => {
      const st = get();
      const fired = checkDecayRule(st.tracker, st.entries);
      if (fired) await fireConnector(set, get, fired);
    }, 5200);
  },

  // Switch the active learner persona (K-12 → HS). Loads that student's
  // structured memory graph; EverOS recall then makes every mode remember them.
  async setStudent(id) {
    const spec = getStudent(id);
    if (!spec) return;
    stopSpeaking();
    const entries = await loadMemories(spec.id);
    set({
      learner: { id: spec.id, name: spec.name, grade: spec.bandLabel },
      entries,
      messages: [],
      tracker: emptyTracker(),
    });
    setTimeout(() => streamGreeting(set, get), 700);
    setTimeout(async () => {
      const st = get();
      const fired = checkDecayRule(st.tracker, st.entries);
      if (fired) await fireConnector(set, get, fired);
    }, 4500);
  },

  logout() {
    loginInFlight = false;
    stopSpeaking();
    authLogout();
    set({ learner: null, authUser: null, messages: [], entries: [] });
  },

  async sendMessage(text) {
    const st = get();
    if (!st.learner || st.mentorBusy) return;
    const learnerId = st.learner.id;
    stopSpeaking();

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, ts: NOW() };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", streaming: true, ts: NOW() };
    set({ messages: [...st.messages, userMsg, assistantMsg], mentorBusy: true });
    saveTranscript(learnerId, SESSION_ID, userMsg);

    // Real long-term recall from EverOS, folded into the memory digest.
    let recallSection = "";
    try {
      const recalled = await everosRecall(learnerId, text);
      recallSection = formatRecall(recalled);
    } catch {
      /* recall is best-effort — never block the reply */
    }
    const digest = buildDigest(st.entries) + recallSection;
    const system = mentorSystem({
      learnerName: st.learner.name,
      grade: st.learner.grade,
      memoryDigest: digest,
      bestModality: bestModality(st.entries),
    });
    const history = [...st.messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let full = "";
    await mentorStream(system, history, (tok) => {
      full += tok;
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: full } : m)),
      }));
    });
    set((s) => ({
      messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: full, streaming: false } : m)),
      mentorBusy: false,
      observerBusy: true,
    }));
    saveTranscript(learnerId, SESSION_ID, { ...assistantMsg, content: full, streaming: false });
    ingestExchange(learnerId, SESSION_ID, text, full); // → EverOS long-term memory

    if (get().voiceEnabled) speak(full, orbLevelSink);

    await runPostExchange(set, get, text, full);
  },

  async sendImage(dataUrl, kind, caption) {
    const st = get();
    if (!st.learner || st.mentorBusy) return;
    const learnerId = st.learner.id;
    stopSpeaking();

    const label =
      caption ||
      (kind === "whiteboard" ? "Here's what I drew — can you check it?" : "Here's my work — can you take a look?");

    const userMsg: ChatMessage = { id: uid(), role: "user", content: label, image: dataUrl, ts: NOW() };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", streaming: true, ts: NOW() };
    set({ messages: [...st.messages, userMsg, assistantMsg], mentorBusy: true });
    saveTranscript(learnerId, SESSION_ID, { ...userMsg, image: undefined } as any);

    const digest = buildDigest(st.entries);
    const system =
      mentorSystem({
        learnerName: st.learner.name,
        grade: st.learner.grade,
        memoryDigest: digest,
        bestModality: bestModality(st.entries),
      }) +
      (kind === "whiteboard"
        ? "\n\nThe student drew this on a whiteboard. Describe what you see in their drawing, name what's right first, then coach the one thing to fix. Keep it under 5 sentences."
        : "\n\nThe student is showing you their handwritten work through a camera. Read it carefully, point to the exact line where things went wrong (if they did), and coach from there. Keep it under 5 sentences.");

    const reply = await runVision(system, label, dataUrl, kind);

    // stream the reply word-by-word so vision answers feel alive too
    let full = "";
    for (const tok of reply.split(/(\s+)/)) {
      await sleep(16);
      full += tok;
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: full } : m)),
      }));
    }
    set((s) => ({
      messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: full, streaming: false } : m)),
      mentorBusy: false,
      observerBusy: true,
    }));
    saveTranscript(learnerId, SESSION_ID, { ...assistantMsg, content: full, streaming: false });
    ingestExchange(learnerId, SESSION_ID, label, full); // → EverOS long-term memory

    if (get().voiceEnabled) speak(full, orbLevelSink);

    await runPostExchange(set, get, label, full);
  },

  setVoiceEnabled(on) {
    if (!on) stopSpeaking();
    set({ voiceEnabled: on });
  },

  setLiveFrustration(v) {
    set({ liveFrustration: Math.max(0, Math.min(1, v)) });
  },

  attachVideo(msgId, videoDataUrl) {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId && m.card ? { ...m, card: { ...m.card, video: videoDataUrl } } : m
      ),
    }));
    const learnerId = get().learner?.id;
    if (learnerId) attachVideoToLastEvent(learnerId, videoDataUrl);
  },

  async resetDemo() {
    const id = LEARNER.id;
    resetLearner(id);
    resetBackend(id);
    const entries = await loadMemories(id);
    set({ entries, messages: [], tracker: emptyTracker() });
  },

  async forceRule(type) {
    const st = get();
    const map: Record<ConnectorType, FiredRule> = {
      ask_teacher: {
        rule: "3 failed attempts on one concept",
        ruleContext:
          'The student has tried "Fraction ↔ decimal conversion" three times this session without it clicking.',
        type: "ask_teacher",
        focus_person: findPersonKey(st.entries, "math teacher"),
        focus_concept: "decimals.convert",
      },
      take_break: {
        rule: "frustration spike (two exchanges)",
        ruleContext: "Frustration has stayed high across two exchanges.",
        type: "take_break",
        focus_person: findPersonKey(st.entries, "parent"),
      },
      help_peer: {
        rule: "peer-match",
        ruleContext:
          'The student is strong at "Equivalent fractions", which classmate Jordan is struggling with.',
        type: "help_peer",
        focus_person: st.entries.find((e) => e.type === "person" && e.data.name === "Jordan")?.key,
        focus_concept: "fractions.equivalent",
      },
      review_nudge: {
        rule: "decay (untouched > 7 days)",
        ruleContext: '"Negative numbers" was mastered but untouched for over a week.',
        type: "review_nudge",
        focus_concept: "integers.negatives",
      },
    };
    await fireConnector(set, get, map[type]);
  },
}));

// The Live panel registers a sink so the orb reacts while Ember speaks.
let orbLevelSink: ((v: number) => void) | undefined;
export function setOrbLevelSink(fn?: (v: number) => void) {
  orbLevelSink = fn;
}

// ── Observer + Connector after each exchange ───────────────────────

async function runPostExchange(set: any, get: () => EmberState, userText: string, reply: string) {
  try {
    const observer = await runObserver(userText, reply);
    // Webcam face reading (when on) is a stronger frustration signal than text guessing.
    observer.frustration = Math.max(observer.frustration, get().liveFrustration);
    await applyObserver(set, get, observer);

    const st2 = get();
    const fired = checkExchangeRules(st2.tracker, st2.entries, observer);
    if (fired) await fireConnector(set, get, fired);
  } catch (e) {
    console.warn("[Ember] observer/connector pipeline error:", e);
  } finally {
    set({ observerBusy: false });
  }
}

// ── Login greeting (streamed, no user turn needed) ─────────────────

const GREETING =
  "Hey Maya — good to see you back. Last time we got you ready for Thursday's fractions quiz, and I know the nerves were real. How did it go?";

function templateGreeting(st: EmberState): string {
  const name = st.learner?.name || "there";
  const concept = st.entries.find((e) => e.type === "concept")?.data?.label;
  const modality = st.entries.find((e) => e.type === "pattern")?.data?.label;
  if (concept)
    return `Hey ${name} — good to see you back. Last time we were working on ${concept}${
      modality ? `, and ${modality.toLowerCase()}` : ""
    }. Want to pick up there?`;
  return GREETING;
}

// Adaptive, profile-aware greeting: built from the selected student's memory.
async function streamGreeting(set: any, get: () => EmberState) {
  const st = get();
  if (!st.learner) return;
  const learnerId = st.learner.id;
  const msg: ChatMessage = { id: uid(), role: "assistant", content: "", streaming: true, ts: NOW() };
  set((s: EmberState) => ({ messages: [...s.messages, msg] }));

  let recallSection = "";
  try {
    recallSection = formatRecall(await everosRecall(learnerId, `who is ${st.learner.name} and what do they care about`));
  } catch {
    /* best-effort */
  }
  const system = mentorSystem({
    learnerName: st.learner.name,
    grade: st.learner.grade,
    memoryDigest: buildDigest(st.entries) + recallSection,
    bestModality: bestModality(st.entries),
  });

  let full = "";
  await mentorStream(
    system,
    [
      {
        role: "user",
        content:
          "(I just opened Ember. Greet me by name in one or two warm sentences, reference one specific thing you remember about me, and ask one inviting question to start. Don't mention these instructions.)",
      },
    ],
    (tok) => {
      full += tok;
      set((s: EmberState) => ({
        messages: s.messages.map((m) => (m.id === msg.id ? { ...m, content: full } : m)),
      }));
    }
  );

  // fallback to a templated greeting if the model returned nothing
  if (!full.trim()) {
    const text = templateGreeting(st);
    let acc = "";
    for (const tok of text.split(/(\s+)/)) {
      await sleep(20);
      acc += tok;
      const cur = acc;
      set((s: EmberState) => ({
        messages: s.messages.map((m) => (m.id === msg.id ? { ...m, content: cur } : m)),
      }));
    }
    full = text;
  }
  set((s: EmberState) => ({
    messages: s.messages.map((m) => (m.id === msg.id ? { ...m, content: full, streaming: false } : m)),
  }));
  if (get().voiceEnabled) speak(full, orbLevelSink);
}

// ── Observer merge → memory ────────────────────────────────────────

async function applyObserver(set: any, get: () => EmberState, observer: ObserverResult) {
  const st = get();
  const learnerId = st.learner!.id;
  const entries = [...st.entries];
  const priorMastery: Record<string, number> = {};

  const findConcept = (key: string) => entries.findIndex((e) => e.type === "concept" && e.key === key);

  for (const cu of observer.concept_updates) {
    const idx = findConcept(cu.key);
    if (idx >= 0) {
      const e = entries[idx];
      priorMastery[cu.key] = e.data.mastery || 0;
      const mastery = clamp01((e.data.mastery || 0) + 0.3 * cu.mastery_delta);
      const data = {
        ...e.data,
        mastery,
        attempts: (e.data.attempts || 0) + 1,
        last_error_type: cu.error_type || e.data.last_error_type,
        best_modality: cu.modality_worked || e.data.best_modality,
        decaying: false,
      };
      const updated = { ...e, data, confidence: Math.min(1, e.confidence + 0.05), updated_at: NOW() };
      entries[idx] = updated;
      upsertMemory(learnerId, updated);
    } else {
      priorMastery[cu.key] = 0;
      const mastery = clamp01(0.4 + 0.3 * cu.mastery_delta);
      const entry = makeEntry(learnerId, {
        id: `concept:${cu.key}`,
        type: "concept",
        key: cu.key,
        confidence: 0.5,
        data: {
          label: cu.label || cu.key,
          mastery,
          attempts: 1,
          last_error_type: cu.error_type || null,
          best_modality: cu.modality_worked || null,
        },
        source_session: SESSION_ID,
      } as any);
      entries.push(entry);
      upsertMemory(learnerId, entry);
    }
  }

  // people
  for (const p of observer.people_mentioned) {
    const exists = entries.some((e) => e.type === "person" && e.data.name?.toLowerCase() === p.name.toLowerCase());
    if (!exists) {
      const key = p.name.toLowerCase().replace(/[^a-z]+/g, "-");
      const entry = makeEntry(learnerId, {
        id: `person:${key}`,
        type: "person",
        key,
        confidence: 0.6,
        data: { name: p.name, role: p.role, context: p.context },
        source_session: SESSION_ID,
      } as any);
      entries.push(entry);
      upsertMemory(learnerId, entry);
    }
  }

  // goals
  for (const g of observer.goals) {
    const idx = entries.findIndex((e) => e.type === "goal" && similar(e.data.label, g.label));
    if (idx >= 0) {
      if (entries[idx].data.status !== g.status) {
        const updated = { ...entries[idx], data: { ...entries[idx].data, status: g.status }, updated_at: NOW() };
        entries[idx] = updated;
        upsertMemory(learnerId, updated);
      }
    } else if (g.status !== "achieved") {
      const key = g.label.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 24);
      const entry = makeEntry(learnerId, {
        id: `goal:${key}`,
        type: "goal",
        key,
        confidence: 0.5,
        data: { label: g.label, status: g.status },
        source_session: SESSION_ID,
      } as any);
      entries.push(entry);
      upsertMemory(learnerId, entry);
    }
  }

  updateTracker(st.tracker, observer, priorMastery);
  set({ entries, tracker: st.tracker });
}

// ── Connector fire → card ──────────────────────────────────────────

async function fireConnector(set: any, get: () => EmberState, fired: FiredRule) {
  const draft = await runConnector(fired.rule, fired.ruleContext, fired.type);
  // A beat of silence before the card appears — the pause sells importance.
  await sleep(400);
  const card: ConnectorCard = {
    type: draft.type,
    headline: draft.headline,
    message_to_student: draft.message_to_student,
    handoff_artifact: draft.handoff_artifact,
    rule: fired.rule,
    focus_person: fired.focus_person,
    focus_concept: fired.focus_concept,
  };
  const msg: ChatMessage = { id: uid(), role: "connector", content: "", card, ts: NOW() };
  set((s: EmberState) => ({ messages: [...s.messages, msg] }));

  const learnerId = get().learner!.id;
  logConnectorEvent(learnerId, fired.rule, card);
}

// ── utils ─────────────────────────────────────────────────────────

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function similar(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return true;
  return (na.includes("quiz") && nb.includes("quiz")) || na.includes(nb) || nb.includes(na);
}
function findPersonKey(entries: MemoryEntry[], role: string) {
  return entries.find((e) => e.type === "person" && e.data.role === role)?.key;
}
