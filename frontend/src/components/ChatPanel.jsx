import { useMemo, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient.js';
import Spinner from './ui/Spinner.jsx';

export default function ChatPanel({ noteId }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const canSend = useMemo(() => {
    return !sending && message.trim().length > 0;
  }, [message, sending]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setError('');

    const userMsg = { id: crypto.randomUUID?.() ?? String(Date.now()), role: 'user', text: trimmed };

    setMessages((current) => [...current, userMsg]);
    setMessage('');
    setSending(true);

    // allow UI to paint then scroll
    queueMicrotask(scrollToBottom);

    try {
      const res = await axiosClient.post('/ai/chat', {
        note_id: Number(noteId),
        message: trimmed,
      });

      const reply = res.data?.data?.reply ?? res.data?.reply ?? '';
      const aiMsg = {
        id: crypto.randomUUID?.() ?? String(Date.now() + 1),
        role: 'ai',
        text: reply || 'No reply returned.',
      };

      setMessages((current) => [...current, aiMsg]);
      queueMicrotask(scrollToBottom);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message.');
      setMessages((current) => current.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="sectionHeader">
        <div>
          <div className="eyebrow">AI chat</div>
          <h3 className="sectionTitle">Ask questions about your study material</h3>
        </div>
        <span className="pill">/ai/chat</span>
      </div>

      <div
        ref={listRef}
        className="chatList"
        style={{
          border: '1px solid var(--line)',
          background: 'rgba(8, 18, 32, 0.82)',
          borderRadius: 18,
          padding: 14,
          height: 360,
          overflow: 'auto',
        }}
      >
        {messages.length === 0 ? (
          <div className="muted" style={{ lineHeight: 1.6 }}>
            Ask things like: “Explain this in simple terms”, “What are the key definitions?”, “Give me examples from the text”.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'user' ? 'chatBubble chatBubbleUser' : 'chatBubble chatBubbleAi'}
              >
                <div className="chatBubbleRole">{m.role === 'user' ? 'You' : 'StudyFlow AI'}</div>
                <div className="chatBubbleText">{m.text}</div>
              </div>
            ))}
            {sending ? (
              <div className="chatBubble chatBubbleAi">
                <div className="chatBubbleRole">StudyFlow AI</div>
                <Spinner size="sm" label="Thinking…" />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <div className="chatComposer" style={{ display: 'flex', gap: 10 }}>
        <input
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your question…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={sending}
        />
        <button className="button buttonAccent" type="button" onClick={send} disabled={!canSend}>
          Send
        </button>
      </div>
    </section>
  );
}
