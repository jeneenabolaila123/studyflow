import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import NoteForm from '../components/NoteForm.jsx';

export default function DashboardPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authCheck, setAuthCheck] = useState({
    ok: null,
    status: null,
    message: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAuthCheck({ ok: null, status: null, message: '' });

    try {
      const res = await axiosClient.get('/notes');
      setNotes(res.data?.data || []);
      setAuthCheck({ ok: true, status: res.status, message: '' });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Request failed.';

      setAuthCheck({ ok: false, status: status ?? null, message });

      if (status === 403) setError('Forbidden.');
      else if (status !== 401) setError(message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ✅ Load notes
    load();
  }, [load]);

  return (
    <div className="row">
      <div className="col">
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        <p className="muted">Your uploaded PDF notes.</p>

        <div className="muted" style={{ marginBottom: 12 }}>
          <span className="pill">
            {authCheck.ok === null
              ? 'API Auth: Checking…'
              : authCheck.ok
              ? 'API Auth OK ✅'
              : `API Auth: ${authCheck.status ?? 'No status'} — ${authCheck.message}`}
          </span>
        </div>

        {error ? <div className="errorBox">{error}</div> : null}

        {loading ? (
          <div className="card">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="card">No notes yet.</div>
        ) : (
          <div className="list">
            {notes.map((n) => (
              <div className="listItem" key={n.id}>
                <div>
                  <div className="title">{n.title}</div>
                  <div className="muted">
                    <span className="pill">{n.status}</span>{' '}
                    <span className="pill">{n.mime_type}</span>{' '}
                    <span className="pill">
                      {Math.round((n.file_size || 0) / 1024)} KB
                    </span>
                  </div>
                </div>

                <div className="actions">
                  <Link className="link" to={`/notes/${n.id}`}>
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="col">
        <h3 style={{ marginTop: 0 }}>Upload a PDF</h3>
        <NoteForm onCreated={load} />
      </div>
    </div>
  );
}