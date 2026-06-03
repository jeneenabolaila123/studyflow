const SUMMARY_OPTIONS = [
  { value: 'bullet_points', label: 'Bullet points' },
  { value: 'paragraph', label: 'Simple paragraph' },
  { value: 'detailed', label: 'Detailed explanation' },
];

export default function SummaryPanel({
  note,
  summaryMode,
  onSummaryModeChange,
  onGenerate,
  loading,
  error,
  meta,
}) {
  const hasSummary = Boolean(note?.ai_summary);

  return (
    <section className="card summaryPanel">
      <div className="sectionHeader">
        <div>
          <div className="eyebrow">AI study assistant</div>
          <h3 className="sectionTitle">Generate a student-friendly summary</h3>
        </div>

        <div className="pillRow">
          <span className="pill">Model: phi3:mini</span>
          <span className="pill">Local Ollama</span>
        </div>
      </div>

      <p className="muted summaryLead">
        The assistant works from uploaded files or pasted text, keeps to the source material, and adapts the final result to the format you choose.
      </p>

      <div className="summaryControls">
        <label className="field summaryField">
          <span className="label">Summary format</span>
          <select
            className="input select"
            value={summaryMode}
            onChange={(event) => onSummaryModeChange(event.target.value)}
            disabled={loading}
          >
            {SUMMARY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button className="button buttonAccent" type="button" onClick={onGenerate} disabled={loading}>
          {loading ? 'Generating summary...' : 'Generate summary'}
        </button>
      </div>

      {loading ? (
        <div className="thinkingCard" aria-live="polite">
          <div className="thinkingPulse" />
          <div>
            <div className="thinkingTitle">AI is analyzing your study file</div>
            <div className="muted">
              Cleaning the source text, processing chunks, and preparing the final summary
              <span className="thinkingDots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="errorBox">{error}</div> : null}

      <div className="summaryContainer">
        {hasSummary ? (
          <div className="summaryContent">{note.ai_summary}</div>
        ) : (
          <div className="summaryEmpty">
            No summary yet. Choose a format and generate one from the saved study material.
          </div>
        )}
      </div>

      {hasSummary || meta ? (
        <div className="pillRow metaRow">
          {note?.ai_summary_generated_at ? (
            <span className="pill">Updated: {new Date(note.ai_summary_generated_at).toLocaleString()}</span>
          ) : null}
          {meta?.chunkCount ? <span className="pill">Chunks: {meta.chunkCount}</span> : null}
          {meta?.sourceCharacters ? <span className="pill">Source size: {meta.sourceCharacters.toLocaleString()} chars</span> : null}
        </div>
      ) : null}
    </section>
  );
}