import { useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function NoteForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdf, setPdf] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [txtFile, setTxtFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const hasText = Boolean(textContent && textContent.trim().length);
    if (!pdf && !txtFile && !hasText) {
      setError('Please upload a PDF or add text (paste or .txt).');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (pdf) formData.append('pdf', pdf);
      if (hasText) formData.append('text_content', textContent.trim());
      if (txtFile) formData.append('txt_file', txtFile);

      await axiosClient.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTitle('');
      setDescription('');
      setPdf(null);
      setTextContent('');
      setTxtFile(null);
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

      <div style={{ margin: '10px 0' }}>
        <div className="label" style={{ fontWeight: 600 }}>
          Add Note (Optional)
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          You can paste/write text and/or upload a .txt file. This is optional.
        </div>
      </div>

      <div className="field">
        <div className="label">Text (optional)</div>
        <textarea
          className="textarea"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Write or paste your note text here..."
        />
        {fieldErrors.text_content?.length ? (
          <div className="muted" style={{ color: '#991b1b' }}>
            {fieldErrors.text_content[0]}
          </div>
        ) : null}
      </div>

      <div className="field">
        <div className="label">TXT file (optional)</div>
        <input
          className="input"
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => setTxtFile(e.target.files?.[0] || null)}
        />
        {fieldErrors.txt_file?.length ? (
          <div className="muted" style={{ color: '#991b1b' }}>
            {fieldErrors.txt_file[0]}
          </div>
        ) : null}
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Uploading...' : 'Create Note'}
      </button>
    </form>
  );
}
