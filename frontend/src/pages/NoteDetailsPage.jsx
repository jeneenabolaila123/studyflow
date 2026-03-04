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
        if (!mounted) return;
        setLoading(false);
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
            <span className="pill">{note.mime_type}</span>{' '}
            <span className="pill">{Math.round((note.file_size || 0) / 1024)} KB</span>
          </div>
        </div>

        <div className="actions">
          <button className="button" type="button" onClick={download} disabled={busy}>
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

      <div style={{ marginTop: 14 }}>
        <Link className="link" to="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
