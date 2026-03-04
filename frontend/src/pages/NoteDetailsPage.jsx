import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function NoteDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [aiError, setAiError] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get(`/notes/${id}`);
        if (!mounted) return;
        setNote(res.data?.data || null);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 403) setError('Forbidden.');
        else if (status === 404) setError('Not found.');
        else if (status !== 401) setError(err?.response?.data?.message || 'Failed to load note.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const download = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await axiosClient.get(`/notes/${id}/download`, {
        responseType: 'blob',
      });

      const contentType = res.headers?.['content-type'] || 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = note?.original_filename || `note-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setError('Forbidden.');
      else if (status === 404) setError('Not found.');
      else if (status !== 401) setError(err?.response?.data?.message || 'Download failed.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this note?')) return;

    setError('');
    setBusy(true);
    try {
      await axiosClient.delete(`/notes/${id}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setError('Forbidden.');
      else if (status === 404) setError('Not found.');
      else if (status !== 401) setError(err?.response?.data?.message || 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const generateSummary = async () => {
    setAiError('');
    setSummaryLoading(true);
    try {
      const res = await axiosClient.post('/ai/summarize', {
        note_id: Number(id),
      });

      setSummary(res.data?.data?.summary || '');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) setAiError('Too many requests. Please wait and try again.');
      else if (status === 403) setAiError('Forbidden.');
      else if (status === 404) setAiError('Not found.');
      else setAiError(err?.response?.data?.message || 'Failed to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateQuiz = async () => {
    setAiError('');
    setQuizLoading(true);
    try {
      const res = await axiosClient.post('/ai/quiz', {
        note_id: Number(id),
        count: 5,
      });

      setQuizQuestions(res.data?.data?.questions || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) setAiError('Too many requests. Please wait and try again.');
      else if (status === 403) setAiError('Forbidden.');
      else if (status === 404) setAiError('Not found.');
      else setAiError(err?.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setQuizLoading(false);
    }
  };

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setAiError('');
    setChatLoading(true);
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const res = await axiosClient.post('/ai/chat', {
        note_id: Number(id),
        message,
      });

      const reply = res.data?.data?.reply || '';
      setChatMessages((prev) => [...prev, { role: 'ai', content: reply }]);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) setAiError('Too many requests. Please wait and try again.');
      else if (status === 403) setAiError('Forbidden.');
      else if (status === 404) setAiError('Not found.');
      else setAiError(err?.response?.data?.message || 'Failed to send message.');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="card">Loading...</div>;
  }

  if (!note) {
    return (
      <div className="card">
        <div style={{ marginBottom: 12 }}>{error || 'Not found.'}</div>
        <Link className="link" to="/dashboard">Back</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>{note.title}</h2>
          <div className="muted">
            <span className="pill">{note.status}</span>{' '}
            {note.source_type ? <span className="pill">{note.source_type}</span> : null}{' '}
            {note.mime_type ? <span className="pill">{note.mime_type}</span> : null}{' '}
            {note.file_size ? (
              <span className="pill">{Math.round((note.file_size || 0) / 1024)} KB</span>
            ) : null}
          </div>
        </div>

        <div className="actions">
          <button className="button" type="button" onClick={download} disabled={busy || !note.has_file}>
            Download
          </button>
          <button
            className="button buttonSecondary"
            type="button"
            onClick={remove}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>

      {note.description ? (
        <div style={{ marginTop: 12 }}>
          <div className="label">Description</div>
          <div style={{ marginTop: 6 }}>{note.description}</div>
        </div>
      ) : null}

      {error ? <div className="errorBox" style={{ marginTop: 12 }}>{error}</div> : null}

      <div style={{ marginTop: 18 }}>
        <div className="label" style={{ marginBottom: 8 }}>AI Tools</div>
        <div className="actions" style={{ flexWrap: 'wrap' }}>
          <button className="button" type="button" onClick={generateSummary} disabled={summaryLoading}>
            {summaryLoading ? 'Generating...' : 'Generate Summary'}
          </button>
          <button className="button buttonSecondary" type="button" onClick={generateQuiz} disabled={quizLoading}>
            {quizLoading ? 'Generating...' : 'Generate Quiz'}
          </button>
        </div>

        {aiError ? <div className="errorBox" style={{ marginTop: 12 }}>{aiError}</div> : null}

        {summary ? (
          <div style={{ marginTop: 12 }}>
            <div className="label">Summary</div>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{summary}</div>
          </div>
        ) : null}

        {quizQuestions?.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="label">Quiz</div>
            <div style={{ marginTop: 6 }}>
              {quizQuestions.map((q) => (
                <div key={q.number} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Q{q.number}</div>
                  <div>{q.question}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="label" style={{ marginBottom: 8 }}>Ask about this note</div>

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 12,
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 260,
              overflowY: 'auto',
              padding: 2,
            }}
          >
            {chatMessages.length ? (
              chatMessages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: '10px 12px',
                        background: isUser ? '#111827' : '#f9fafb',
                        color: isUser ? '#ffffff' : '#111827',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="muted">Ask a question to start the conversation.</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              className="input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question about this note..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <button className="button" type="button" onClick={sendChat} disabled={chatLoading}>
              {chatLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Link className="link" to="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
