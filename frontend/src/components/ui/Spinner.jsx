export default function Spinner({ label = 'Loading…', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'spinner spinner--sm' : size === 'lg' ? 'spinner spinner--lg' : 'spinner';

  return (
    <span className="spinnerWrap" aria-label={label} role="status">
      <span className={sizeClass} aria-hidden="true" />
      <span className="spinnerLabel">{label}</span>
    </span>
  );
}
