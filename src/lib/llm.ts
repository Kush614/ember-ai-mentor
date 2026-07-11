import { config, llmMode } from "./config";
import { getAccessToken } from "./auth";
import {
  OBSERVER_SYSTEM,
  observerUser,
  connectorSystem,
} from "./prompts";
import type { ObserverResult, ConnectorType } from "../types";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Claude endpoint + headers. In "proxy" mode we hit the Butterbase `claude`
// function (auth-required, so attach the user JWT) and the key stays
// server-side. In direct "anthropic" mode we call the API with the raw key.
async function claudeReq(): Promise<{ url: string; headers: Record<string, string> }> {
  if (llmMode === "proxy") {
    // The Butterbase `claude` function is public (key stays server-side), so
    // no JWT is needed here — keeps the LLM path independent of token expiry.
    return {
      url: config.claudeProxyUrl,
      headers: { "content-type": "application/json" },
    };
  }
  return {
    url: "https://api.anthropic.com/v1/messages",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
  };
}

// ── Low-level transport ───────────────────────────────────────────

async function anthropicStream(
  system: string,
  messages: ChatTurn[],
  onToken: (t: string) => void
): Promise<string> {
  const { url, headers } = await claudeReq();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 700,
      stream: true,
      system,
      messages,
    }),
  });
  return consumeSSE(res, (json) => {
    if (json.type === "content_block_delta" && json.delta?.text) {
      onToken(json.delta.text);
      return json.delta.text;
    }
    return "";
  });
}

async function nebiusStream(
  system: string,
  messages: ChatTurn[],
  onToken: (t: string) => void
): Promise<string> {
  const res = await fetch(`${config.nebiusBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.nebiusKey}`,
    },
    body: JSON.stringify({
      model: config.nebiusModel,
      max_tokens: 700,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  return consumeSSE(res, (json) => {
    const t = json.choices?.[0]?.delta?.content || "";
    if (t) onToken(t);
    return t;
  });
}

async function consumeSSE(
  res: Response,
  extract: (json: any) => string
): Promise<string> {
  if (!res.ok || !res.body) throw new Error(`LLM HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        full += extract(JSON.parse(payload));
      } catch {
        /* ignore keepalives / partial */
      }
    }
  }
  return full;
}

async function jsonCall(system: string, user: string, maxTokens = 700): Promise<string> {
  if (llmMode === "anthropic" || llmMode === "proxy") {
    const { url, headers } = await claudeReq();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const j = await res.json();
    return j.content?.[0]?.text || "";
  }
  // nebius
  const res = await fetch(`${config.nebiusBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.nebiusKey}`,
    },
    body: JSON.stringify({
      model: config.nebiusModel,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

// ── Vision (camera / whiteboard frames) ───────────────────────────

function splitDataUrl(dataUrl: string): { mediaType: string; base64: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  return m ? { mediaType: m[1], base64: m[2] } : { mediaType: "image/png", base64: dataUrl };
}

async function anthropicVision(system: string, userText: string, imageDataUrl: string): Promise<string> {
  const { mediaType, base64 } = splitDataUrl(imageDataUrl);
  const { url, headers } = await claudeReq();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 600,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  });
  const j = await res.json();
  return j.content?.[0]?.text || "";
}

async function nebiusVision(system: string, userText: string, imageDataUrl: string): Promise<string> {
  const res = await fetch(`${config.nebiusBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.nebiusKey}` },
    body: JSON.stringify({
      model: config.nebiusModel,
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  });
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

export async function runVision(
  system: string,
  userText: string,
  imageDataUrl: string,
  kind: "homework" | "whiteboard"
): Promise<string> {
  if (llmMode !== "mock") {
    try {
      if (llmMode === "anthropic" || llmMode === "proxy")
        return await anthropicVision(system, userText, imageDataUrl);
      return await nebiusVision(system, userText, imageDataUrl);
    } catch (e) {
      console.warn("[Ember] vision call failed, using mock:", e);
    }
  }
  return mockVision(kind);
}

function mockVision(kind: "homework" | "whiteboard"): string {
  if (kind === "whiteboard") {
    return "Nice sketch — I can see what you're going for. Your bar is split into 4 equal parts and you shaded 2, so you've drawn 2/4. Here's the thing: 2/4 is the same as 1/2 — same amount of the bar, just cut differently. Try shading one more part. What fraction would you have then?";
  }
  return "Okay, I can read your work — and you're closer than you think. Line 1 and 2 are solid. On line 3 you divided 4 by 3 instead of 3 by 4: for 3/4, the top number goes inside the division. Try 3 ÷ 4 again and tell me what you get.";
}

// ── Public agent API ──────────────────────────────────────────────

export async function mentorStream(
  system: string,
  history: ChatTurn[],
  onToken: (t: string) => void
): Promise<string> {
  try {
    if (llmMode === "anthropic" || llmMode === "proxy") return await anthropicStream(system, history, onToken);
    if (llmMode === "nebius") return await nebiusStream(system, history, onToken);
  } catch (e) {
    console.warn("[Ember] mentor real call failed, using mock:", e);
  }
  return mockMentorStream(history, onToken);
}

// ── Generic helpers for the Ember suite (Scaffold / Viva / Sidecar / Compass) ──

export const llmLive = llmMode !== "mock";

/** One-shot completion. Returns "" when no real LLM is configured. */
export async function complete(system: string, user: string, maxTokens = 1400): Promise<string> {
  if (llmMode === "mock") return "";
  try {
    return await jsonCall(system, user, maxTokens);
  } catch (e) {
    console.warn("[Ember] complete failed:", e);
    return "";
  }
}

/** Completion parsed as JSON (fences stripped). Returns null on failure. */
export async function completeJSON<T = any>(
  system: string,
  user: string,
  maxTokens = 1600
): Promise<T | null> {
  const raw = await complete(system, user, maxTokens);
  if (!raw) return null;
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    // salvage the first {...} or [...] block
    const m = raw.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* give up */
      }
    }
    return null;
  }
}

/** Generic streaming chat (used by Viva). Mock streams a gentle placeholder. */
export async function chatStream(
  system: string,
  history: ChatTurn[],
  onToken: (t: string) => void
): Promise<string> {
  try {
    if (llmMode === "anthropic" || llmMode === "proxy") return await anthropicStream(system, history, onToken);
    if (llmMode === "nebius") return await nebiusStream(system, history, onToken);
  } catch (e) {
    console.warn("[Ember] chatStream failed, using mock:", e);
  }
  const text = "Tell me more about how you're thinking about that.";
  for (const w of text.split(/(\s+)/)) {
    await new Promise((r) => setTimeout(r, 20));
    onToken(w);
  }
  return text;
}

export async function runObserver(
  userMsg: string,
  assistantMsg: string
): Promise<ObserverResult> {
  if (llmMode !== "mock") {
    try {
      const raw = await jsonCall(OBSERVER_SYSTEM, observerUser(userMsg, assistantMsg));
      return normalizeObserver(JSON.parse(stripFences(raw)));
    } catch (e) {
      console.warn("[Ember] observer real call failed, using mock:", e);
    }
  }
  return mockObserver(userMsg, assistantMsg);
}

export async function runConnector(
  ruleName: string,
  ruleContext: string,
  fallbackType: ConnectorType
): Promise<{
  type: ConnectorType;
  headline: string;
  message_to_student: string;
  handoff_artifact: string | null;
}> {
  if (llmMode !== "mock") {
    try {
      const raw = await jsonCall(connectorSystem(ruleName, ruleContext), "Draft it now.");
      const j = JSON.parse(stripFences(raw));
      return {
        type: (j.type as ConnectorType) || fallbackType,
        headline: j.headline || "",
        message_to_student: j.message_to_student || "",
        handoff_artifact: j.handoff_artifact ?? null,
      };
    } catch (e) {
      console.warn("[Ember] connector real call failed, using mock:", e);
    }
  }
  return mockConnector(fallbackType, ruleContext);
}

// ── Helpers ───────────────────────────────────────────────────────

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeObserver(j: any): ObserverResult {
  return {
    concept_updates: Array.isArray(j.concept_updates) ? j.concept_updates : [],
    frustration: clamp01(j.frustration),
    engagement: clamp01(j.engagement),
    people_mentioned: Array.isArray(j.people_mentioned) ? j.people_mentioned : [],
    goals: Array.isArray(j.goals) ? j.goals : [],
    notable: j.notable ?? null,
  };
}

function clamp01(n: any): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(1, v));
}

// ── Mock brain (demo-aware, works with zero credentials) ──────────
// Shared state so the mock Observer can see how the mock Mentor graded.

const mockLesson = {
  active: false,
  attempts: 0,
  concept: "decimals.convert",
};
let lastGrade: "correct" | "wrong" | null = null;

function looksLikeAnswer(msg: string): boolean {
  return /\d/.test(msg) || /idk|dunno|no idea|\?$/.test(msg);
}

function isCorrectDecimal(msg: string): boolean {
  return /0?\.75|3\/4|three quarter|75\b/.test(msg);
}

function mockMentorText(history: ChatTurn[]): string {
  const last = [...history].reverse().find((m) => m.role === "user")?.content || "";
  const m = last.toLowerCase();
  lastGrade = null;

  // greeting / continuity
  if (/^\s*(hey|hi|hello|yo|sup)\b/.test(m) && m.length < 30) {
    mockLesson.active = false;
    return "Hey Maya — really good to see you back. Last time you were gearing up for Thursday's fractions quiz, and I know the nerves were real. How did it go?";
  }

  // quiz outcome
  if (/(pass|passed|aced|got a|nailed|did (great|good|well)|crushed|👍)/.test(m)) {
    mockLesson.active = false;
    return "That's huge, Maya. 🎉 The soccer-ratio trick from last week clearly stuck. Want to ride that momentum into something new today — like turning fractions into decimals?";
  }

  // start decimals lesson
  if (/decimal|convert|\.\d|point/.test(m) && !mockLesson.active) {
    mockLesson.active = true;
    mockLesson.attempts = 0;
    return "Love it. Think of a fraction like a soccer stat: 3/4 means '3 goals out of 4 shots'. A decimal just asks the same thing out of 1 whole. So — what is 3 divided by 4? Take your best shot.";
  }

  // grading within decimals lesson
  if (mockLesson.active && looksLikeAnswer(m)) {
    if (isCorrectDecimal(m)) {
      mockLesson.active = false;
      lastGrade = "correct";
      return "Yes! 3 ÷ 4 = 0.75. You just scored — 3 out of 4 shots is exactly 0.75 of the way there. See how the fraction and the decimal are the same play, told two ways?";
    }
    mockLesson.attempts += 1;
    lastGrade = "wrong";
    if (mockLesson.attempts >= 3) {
      return "Still not clicking — and that's totally okay. Let's pause here for a sec. This is the kind of thing that lands faster face-to-face.";
    }
    return "Not quite — no stress. Picture 4 shots on goal. If 3 go in, how much of the net did you fill? Try dividing the top by the bottom: 3 ÷ 4.";
  }

  // frustration
  if (/don'?t get|confused|stuck|ugh|hate|too hard|give up|frustrat/.test(m)) {
    return "Okay — deep breath. We'll slow way down. Tell me the one part that feels fuzziest and we'll take just that piece.";
  }

  // fallback Socratic
  return "Good — walk me through your thinking so far. What's the first step you'd try, and why?";
}

async function mockMentorStream(
  history: ChatTurn[],
  onToken: (t: string) => void
): Promise<string> {
  const text = mockMentorText(history);
  const tokens = text.split(/(\s+)/);
  for (const t of tokens) {
    await new Promise((r) => setTimeout(r, 18 + Math.min(40, t.length * 6)));
    onToken(t);
  }
  return text;
}

function mockObserver(userMsg: string, assistantMsg: string): ObserverResult {
  const m = userMsg.toLowerCase();
  const a = assistantMsg.toLowerCase();

  let frustration = 0.12;
  if (/don'?t get|confused|stuck|ugh|hate|too hard|give up|frustrat/.test(m)) frustration = 0.8;
  else if (/idk|dunno|not sure|hmm|no idea/.test(m)) frustration = 0.45;
  if (lastGrade === "wrong") frustration = Math.max(frustration, 0.72);

  const concept_updates: ObserverResult["concept_updates"] = [];
  const conceptOf = () => {
    if (/decimal|convert|point|\.\d/.test(m + a)) return { key: "decimals.convert", label: "Fraction ↔ decimal conversion" };
    if (/equivalent/.test(m + a)) return { key: "fractions.equivalent", label: "Equivalent fractions" };
    if (/common denominator|unlike/.test(m + a)) return { key: "fractions.add_unlike", label: "Adding unlike fractions" };
    if (/word problem/.test(m + a)) return { key: "fractions.word_problems", label: "Fraction word problems" };
    return null;
  };
  const c = conceptOf();
  if (c) {
    let delta = 0;
    let error: string | null = null;
    let modality: string | null = null;
    if (lastGrade === "correct" || /got it|makes sense|oh i see|i see|that helps|ohh/.test(m)) {
      delta = 0.35;
      modality = /soccer|goal|shot/.test(a) ? "soccer analogies" : null;
    } else if (lastGrade === "wrong") {
      delta = -0.2;
      error = "division place-value slip";
    }
    if (delta !== 0 || error) concept_updates.push({ ...c, mastery_delta: delta, error_type: error, modality_worked: modality });
  }

  const people_mentioned: ObserverResult["people_mentioned"] = [];
  if (/rivera/.test(m)) people_mentioned.push({ name: "Ms. Rivera", role: "math teacher", context: "mentioned by Maya" });
  if (/jordan/.test(m)) people_mentioned.push({ name: "Jordan", role: "classmate", context: "mentioned by Maya" });
  if (/\bmom\b|mother/.test(m)) people_mentioned.push({ name: "Mom", role: "parent", context: "mentioned by Maya" });

  const goals: ObserverResult["goals"] = [];
  if (/(pass|passed|aced|nailed|crushed).*(quiz)|quiz.*(pass|passed|aced)/.test(m))
    goals.push({ label: "Pass Thursday fractions quiz", status: "achieved" });

  return {
    concept_updates,
    frustration,
    engagement: /\?|because|think|try|maybe/.test(m) ? 0.7 : 0.5,
    people_mentioned,
    goals,
    notable: null,
  };
}

function mockConnector(
  type: ConnectorType,
  ctx: string
): {
  type: ConnectorType;
  headline: string;
  message_to_student: string;
  handoff_artifact: string | null;
} {
  switch (type) {
    case "ask_teacher":
      return {
        type,
        headline: "Worth asking Ms. Rivera in person",
        message_to_student:
          "You've given this a real fight, and that matters more than getting it instantly. Fraction-to-decimal conversion is one of those things that clicks fast with someone at a whiteboard — and Ms. Rivera's great at exactly this.",
        handoff_artifact:
          "Hi Ms. Rivera — I keep getting stuck converting fractions to decimals, especially why 3/4 becomes 0.75. Could you walk me through the divide-the-top-by-the-bottom step? I think I'm mixing up which number goes inside.",
      };
    case "take_break":
      return {
        type,
        headline: "Let's take a short breather",
        message_to_student:
          "I can tell this is getting heavy, and that's a sign to rest, not to push. Step away for ten minutes — water, a walk — and we'll pick it right back up. You've earned the pause.",
        handoff_artifact:
          "Note for Mom: Maya worked hard on decimals tonight and got a little frustrated. She's taking a short break — a little encouragement would go a long way.",
      };
    case "help_peer":
      return {
        type,
        headline: "You could help Jordan with this",
        message_to_student:
          "Equivalent fractions are your strength now — and Jordan's been stuck on exactly that. Teaching it back is one of the best ways to lock it in for good. Want to send him a hand?",
        handoff_artifact:
          "Hey Jordan! I heard equivalent fractions have been tricky — they finally clicked for me with a soccer thing (think of it like keeping the same goals-to-shots ratio). Want me to show you at lunch?",
      };
    case "review_nudge":
      return {
        type,
        headline: "Quick refresh on negative numbers?",
        message_to_student:
          "You crushed negative numbers back on the 2nd, but it's been over a week — memories fade fastest right after we learn them. Two minutes of review now will make it stick for good. Remember the number-line trick you liked?",
        handoff_artifact: null,
      };
  }
}
