import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient.js';
import { summarizeNote } from '../api/notes.js';
import ChatPanel from '../components/ChatPanel.jsx';
import QuizPanel from '../components/QuizPanel.jsx';
import SummaryPanel from '../components/SummaryPanel.jsx';
import Tabs from '../components/ui/Tabs.jsx';

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();

  const noteId = id;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('summary');

  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryMode, setSummaryMode] = useState('bullet_points');
  const [summaryError, setSummaryError] = useState('');
  const [summaryMeta, setSummaryMeta] = useState(null);

  const tabs = useMemo(
    () => [
      { id: 'summary', label: 'Summary' },
      { id: 'chat', label: 'AI Chat' },
      { id: 'quiz', label: 'Quiz' },
    ],
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axiosClient.get(`/notes/${noteId}`);
      const loaded = res.data?.data || null;

      setNote(loaded);
      setTitle(loaded?.title || '');
      setDescription(loaded?.description || '');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setError('Forbidden.');
      else if (status === 404) setError('Not found.');
      else if (status !== 401) setError(err?.response?.data?.message || 'Failed to load workspace.');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');

    try {
      const res = await axiosClient.put(`/notes/${noteId}`, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
      });

      const updated = res.data?.data || null;
      if (updated) setNote(updated);
    } catch (err) {
      setError(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setError('');

    try {
      const res = await axiosClient.get(`/notes/${noteId}/download`, {
        responseType: 'blob',
      });

      const contentType = res.headers?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = note?.original_filename || `note-${noteId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || 'Download failed.');
    }
  };

  const remove = async () => {
    const ok = window.confirm('Delete this note?');
    if (!ok) return;

    setSaving(true);
    setError('');

    try {
      await axiosClient.delete(`/notes/${noteId}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = async () => {
    setSummaryError('');
    setSummaryBusy(true);

    try {
      const res = await summarizeNote(noteId, summaryMode);
      const data = res.data?.data || {};

      setNote((current) => {
        if (!current) return current;
        return {
          ...current,
          ai_summary: data.summary || '',
          ai_summary_generated_at: new Date().toISOString(),
          status: 'ready',
        };
      });

      setSummaryMeta({
        chunkCount: data.chunk_count || 0,
        sourceCharacters: data.source_characters || 0,
        format: data.format || summaryMode,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to generate summary.';
      setSummaryError(msg);
    } finally {
      setSummaryBusy(false);
    }
  };

  if (loading) {
    return <div className="card">Loading workspace…</div>;
  }

  if (!note) {
    return (
      <div className="card">
        <div style={{ marginBottom: 12 }}>{error || 'Not found.'}</div>
        <Link className="link" to="/dashboard">
          Back
        </Link>
      </div>
    );
  }

  const summaryNote = {
    ...note,
    title,
    description,
  };

  return (
    <div className="detailsLayout">
      <div className="card detailCard">
        <div className="sectionHeader detailHeader">
          <div>
            <div className="eyebrow">Workspace</div>
            <h2 className="sectionTitle detailTitle" style={{ marginBottom: 6 }}>
              {note.title}
            </h2>
            <div className="muted">
              {note.source_type === 'text'
                ? 'Created from pasted study text'
                : note.original_filename || 'Uploaded study file'}
            </div>
          </div>

          <div className="actions wrapActions">
            {note.has_file ? (
              <button className="button" type="button" onClick={download} disabled={saving || summaryBusy}>
                Download
              </button>
            ) : null}
            <button className="button buttonSecondary" type="button" onClick={remove} disabled={saving || summaryBusy}>
              Delete
            </button>
          </div>
        </div>

        <div className="pillRow metaRow">
          <span className="pill">{note.source_type === 'text' ? 'Text input' : 'File upload'}</span>
          <span className="pill">{note.status}</span>
          {note.mime_type ? <span className="pill">{note.mime_type}</span> : null}
          {note.file_size ? <span className="pill">{Math.round((note.file_size || 0) / 1024)} KB</span> : null}
          {note.text_content_length ? <span className="pill">{note.text_content_length.toLocaleString()} chars</span> : null}
          <span className="pill">{note.ai_summary ? 'Summary ready' : 'Awaiting summary'}</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="label">Title</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="label">Your notes (description)</div>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write your own notes, reminders, and revision points…"
            disabled={saving}
          />
        </div>

        {error ? <div className="errorBox" style={{ marginTop: 14 }}>{error}</div> : null}

        <div className="actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <button className="button buttonAccent" type="button" onClick={save} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link className="link" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'summary' ? (
          <SummaryPanel
            note={summaryNote}
            summaryMode={summaryMode}
            onSummaryModeChange={setSummaryMode}
            onGenerate={generateSummary}
            loading={summaryBusy}
            error={summaryError}
            meta={summaryMeta}
          />
        ) : activeTab === 'chat' ? (
          <ChatPanel noteId={noteId} />
        ) : (
          <QuizPanel noteId={noteId} />
        )}
      </div>
    </div>
  );
}