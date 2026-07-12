import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import Message from "./Message";

const CHIPS = ["Got it", "Show me another", "I'm stuck"];

// Pinned demo prompts — each tagged with the EverMind bounty it shows off.
interface Pin { emoji: string; label: string; q: string; tag: string }

const PINS_DEFAULT: Pin[] = [
  { emoji: "🧠", label: "What do you remember about me?", q: "What do you remember about me?", tag: "Memory Reveal" },
  { emoji: "🔁", label: "Recap last session", q: "What were we working on last time?", tag: "Cross-session" },
  { emoji: "⏭️", label: "Too easy, skip ahead", q: "Honestly this is too easy, skip ahead", tag: "Self-evolving" },
];

// Every student gets bounty-tagged pins tailored to their subject.
const REMEMBER: Pin = { emoji: "🧠", label: "What do you remember about me?", q: "What do you remember about me?", tag: "Memory Reveal" };
const RECAP: Pin = { emoji: "🔁", label: "Recap last session", q: "What were we working on last time?", tag: "Cross-session" };
const SKIP: Pin = { emoji: "⏭️", label: "Too easy, skip ahead", q: "Honestly this is too easy, skip ahead to something harder", tag: "Self-evolving ⏭" };

const PINS_BY_ID: Record<string, Pin[]> = {
  "leo-g1": [
    REMEMBER, RECAP,
    { emoji: "🦕", label: "Count dinosaurs with me", q: "Can you help me count dinosaurs?", tag: "Teach" },
    { emoji: "✅", label: "I did it myself!", q: "I counted all the way to 100 by myself!", tag: "Self-evolving ↑" },
    { emoji: "⏭️", label: "Give me a harder one", q: "That was easy! Give me a harder one", tag: "Self-evolving ⏭" },
  ],
  "aisha-g4": [
    REMEMBER, RECAP,
    { emoji: "🎨", label: "Show 3/4 as a picture", q: "Can you show me 3/4 as a picture?", tag: "Teach" },
    { emoji: "✅", label: "Oh, I get it now!", q: "Ohh the drawing helped — I get fractions now!", tag: "Self-evolving ↑" },
    SKIP,
  ],
  "maya-r-7g": [
    REMEMBER, RECAP,
    { emoji: "⚽", label: "Fraction → decimal", q: "How do I turn a fraction into a decimal?", tag: "Teach" },
    { emoji: "✅", label: "I passed the quiz!", q: "I passed my Thursday fractions quiz!", tag: "Self-evolving ↑" },
    SKIP,
  ],
  "diego-g8": [
    REMEMBER, RECAP,
    { emoji: "🏀", label: "Ratios with basketball", q: "Explain ratios using basketball stats", tag: "Teach" },
    { emoji: "✅", label: "It clicked!", q: "The basketball thing made ratios click for me!", tag: "Self-evolving ↑" },
    SKIP,
  ],
  "sofia-g10": [
    REMEMBER, RECAP,
    { emoji: "🔬", label: "Factor a quadratic", q: "Help me factor x^2 + 5x + 6", tag: "Teach + math" },
    { emoji: "✅", label: "I feel ready now!", q: "I actually feel ready for my test now!", tag: "Self-evolving ↑" },
    SKIP,
  ],
  "marcus-g12": [
    REMEMBER, RECAP,
    { emoji: "📈", label: "Chain rule + formula", q: "Explain the chain rule with the formula and a worked example", tag: "Teach + math" },
    { emoji: "✅", label: "I finally get it!", q: "I finally get the chain rule now — it just clicked!", tag: "Self-evolving ↑" },
    { emoji: "⏭️", label: "Skip to integration", q: "This is too easy, skip ahead to integration by parts", tag: "Self-evolving ⏭" },
  ],
};

export default function Chat() {
  const messages = useStore((s) => s.messages);
  const send = useStore((s) => s.sendMessage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const learner = useStore((s) => s.learner);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const pins = (learner && PINS_BY_ID[learner.id]) || PINS_DEFAULT;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (t: string) => {
    const v = t.trim();
    if (!v || mentorBusy) return;
    setText("");
    send(v);
  };

  // Chips appear when Ember just asked a question and it's the student's turn.
  const last = messages[messages.length - 1];
  const showChips = !mentorBusy && last?.role === "assistant" && !last.streaming && last.content.includes("?");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
        <div className="mx-auto max-w-[640px] space-y-4">
          {messages.map((m) => (
            <Message key={m.id} msg={m} />
          ))}
        </div>
      </div>

      {showChips && (
        <div className="px-6 pb-3">
          <div className="mx-auto max-w-[640px] flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => submit(c)}
                className="h-11 rounded-full border border-ink/10 bg-cloud px-5 text-base text-ink hover:border-ember/60 hover:bg-white transition"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned demo prompts — one click each shows a bounty in action */}
      <div className="px-6 pb-2">
        <div className="mx-auto max-w-[640px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate2/70 mb-1.5">📌 Try — demonstrate the memory</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pins.map((p) => (
              <button
                key={p.q}
                onClick={() => submit(p.q)}
                disabled={mentorBusy}
                title={p.q}
                className="shrink-0 rounded-full border border-ember/30 bg-ember/[0.07] pl-3 pr-2 py-1.5 text-sm text-ink hover:bg-ember/15 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{p.emoji}</span>
                <span className="font-medium">{p.label}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-white bg-ember rounded-full px-1.5 py-0.5">{p.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-1">
        <div className="mx-auto max-w-[640px] flex items-end gap-2 rounded-bubble bg-cloud shadow-day px-4 py-2 border border-transparent focus-within:border-ember/50 transition">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={1}
            placeholder="Ask Ember anything…"
            aria-label="Ask Ember anything"
            className="flex-1 resize-none bg-transparent outline-none text-base text-ink placeholder:text-slate2/70 max-h-32 py-2"
          />
          <button
            onClick={() => submit(text)}
            disabled={mentorBusy || !text.trim()}
            aria-label="Send"
            className="shrink-0 h-11 w-11 grid place-items-center rounded-full bg-ember text-white text-lg font-bold hover:brightness-110 transition disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
