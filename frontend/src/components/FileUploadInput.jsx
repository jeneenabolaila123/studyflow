export default function FileUploadInput({ file, onChange, error, disabled, inputKey }) {
  const prettySize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="field sourceCard">
      <div className="label">Study file</div>
      <input
        key={inputKey}
        className="input"
        type="file"
        accept=".pdf,.docx,.txt,.pptx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        disabled={disabled}
      />
      <div className="muted">
        Upload PDF, DOCX, TXT, or PPTX up to 50 MB. StudyFlow extracts and validates text before AI processing.
      </div>
      {file ? (
        <div className="pillRow" style={{ marginTop: 10 }}>
          <span className="pill">Selected: {file.name}</span>
          {file.type ? <span className="pill">{file.type}</span> : null}
          {file.size ? <span className="pill">{prettySize(file.size)}</span> : null}
        </div>
      ) : null}
      {error ? (
        <div className="muted" style={{ color: '#991b1b' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}