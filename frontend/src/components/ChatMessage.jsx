import { CitationCard } from "./CitationCard";

export default function ChatMessage({ role, content, citations = [] }) {
  const isUser = role === "user";

  return (
    <div className={`chat-message ${role}`}>
      <div className="chat-avatar">{isUser ? "U" : "AI"}</div>

      <div className="chat-bubble">
        <div>{content}</div>

        {!isUser && citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {citations.map((citation, index) => (
              <CitationCard key={index} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="chat-message ai">
      <div className="chat-avatar">AI</div>
      <div className="chat-bubble" style={{ padding: "8px 14px" }}>
        <div className="chat-typing">
          <div className="chat-typing-dot" />
          <div className="chat-typing-dot" />
          <div className="chat-typing-dot" />
        </div>
      </div>
    </div>
  );
}