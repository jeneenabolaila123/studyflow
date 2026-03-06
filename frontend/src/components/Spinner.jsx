export default function Spinner({
    size = "md",
    color = "currentColor",
    className = "",
}) {
    return (
        <span
            className={`spinner spinner-${size} ${className}`}
            style={{ color }}
            role="status"
            aria-label="Loading"
        />
    );
}

export function PageSpinner() {
    return (
        <div className="spinner-page">
            <Spinner size="lg" color="var(--color-accent)" />
        </div>
    );
}
