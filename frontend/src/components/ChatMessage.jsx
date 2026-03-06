export default function ChatMessage({ role, content }) {
    const isUser = role === "user";

    return (
        <div className={`chat-message ${role}`}>
            <div className="chat-avatar">{isUser ? "U" : "AI"}</div>
            <div className="chat-bubble">{content}</div>
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
