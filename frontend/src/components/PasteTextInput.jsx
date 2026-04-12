export default function PasteTextInput({ value, onChange, error, disabled }) {
  return (
    <div className="field sourceCard">
      <div className="label">Paste study text</div>
      <textarea
        className="textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste lecture notes, reading excerpts, or revision material here..."
        disabled={disabled}
      />
      <div className="pasteMeta">
        <span className="muted">The text will be cleaned and stored before chunked AI summarization.</span>
        <span className="pill">{value.trim().length.toLocaleString()} chars</span>
      </div>
      {error ? (
        <div className="muted" style={{ color: '#991b1b' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}