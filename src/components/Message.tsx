import type { ChatMessage } from "../types";
import ConnectorCard from "./ConnectorCard";
import EmberDot from "./EmberDot";
import RichMessage, { stripMedia } from "./RichMessage";

export default function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === "connector" && msg.card) return <ConnectorCard msgId={msg.id} card={msg.card} />;

  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[80%] rounded-bubble rounded-br-lg px-5 py-3 text-base leading-relaxed text-ink bg-ember/[0.12]">
          {msg.image && (
            <img
              src={msg.image}
              alt="What Maya showed Ember"
              className="mb-2 rounded-xl max-h-48 w-auto border border-ink/10"
            />
          )}
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-up" aria-live="polite">
      <div className="mr-3 mt-1.5">
        <EmberDot size={20} active={!!msg.streaming} />
      </div>
      <div className="max-w-[80%] rounded-bubble rounded-bl-lg px-5 py-3 text-base leading-relaxed text-ink bg-cloud shadow-day">
        {msg.streaming ? (
          <p className="whitespace-pre-wrap leading-relaxed">
            {stripMedia(msg.content)}
            {!msg.content && <span className="text-slate2">…</span>}
          </p>
        ) : (
          <RichMessage content={msg.content} />
        )}
      </div>
    </div>
  );
}
