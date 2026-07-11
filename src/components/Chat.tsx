import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import Message from "./Message";

const CHIPS = ["Got it", "Show me another", "I'm stuck"];

export default function Chat() {
  const messages = useStore((s) => s.messages);
  const send = useStore((s) => s.sendMessage);
  const mentorBusy = useStore((s) => s.mentorBusy);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
