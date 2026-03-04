import { useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function NoteForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdf, setPdf] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (pdf) formData.append('pdf', pdf);

      await axiosClient.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTitle('');
      setDescription('');
      setPdf(null);
      onCreated?.();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 422) {
        setFieldErrors(err.response?.data?.errors || {});
      } else if (status === 403) {
        setError('Forbidden.');
      } else if (status === 401) {
        setError('Unauthenticated.');
      } else {
        setError(err?.response?.data?.message || 'Upload failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <div className="label">Title</div>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 1 notes"
        />
        {fieldErrors.title?.length ? (
          <div className="muted" style={{ color: '#991b1b' }}>
            {fieldErrors.title[0]}
          </div>
        ) : null}
      </div>

      <div className="field">
        <div className="label">Description (optional)</div>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description..."
        />
        {fieldErrors.description?.length ? (
          <div className="muted" style={{ color: '#991b1b' }}>
            {fieldErrors.description[0]}
          </div>
        ) : null}
      </div>

      <div className="field">
        <div className="label">PDF</div>
        <input
          className="input"
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdf(e.target.files?.[0] || null)}
        />
        {fieldErrors.pdf?.length ? (
          <div className="muted" style={{ color: '#991b1b' }}>
            {fieldErrors.pdf[0]}
          </div>
        ) : null}
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Uploading...' : 'Upload Note PDF'}
      </button>
    </form>
  );
}
