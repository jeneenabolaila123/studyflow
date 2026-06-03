import { Link } from "react-router-dom";
import Spinner from "./Spinner.jsx";

// ---- Icons -------------------------------------------------------
function FileIcon() {
    return (
        <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}
function EyeIcon() {
    return (
        <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
        </svg>
    );
}
function DownloadIcon() {
    return (
        <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    );
}
// ------------------------------------------------------------------

function mimeLabel(mime) {
    if (!mime) return null;
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("text")) return "TXT";
    return mime.split("/").pop().toUpperCase();
}

function sourceLabel(src) {
    if (!src) return null;
    const map = { pdf: "PDF", text: "Text", txt_file: "TXT", txt: "TXT" };
    return map[src] || src;
}

export default function NoteCard({
    note,
    onDelete,
    onDownload,
    deleting = false,
    downloading = false,
}) {
    const label =
        mimeLabel(note.mime_type) || sourceLabel(note.source_type) || "Note";

    return (
        <div className="note-card" style={{ animationDelay: "0ms" }}>
            {/* Header */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div className="note-card-icon">
                    <FileIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="note-card-title">{note.title}</div>
                    {note.description && (
                        <div
                            className="note-card-desc"
                            style={{ marginTop: 3 }}
                        >
                            {note.description}
                        </div>
                    )}
                </div>
            </div>

            {/* Meta badges */}
            <div className="note-card-meta">
                {note.status && (
                    <span
                        className={`badge ${
                            note.status === "ready"
                                ? "badge-success"
                                : "badge-warning"
                        }`}
                    >
                        {note.status}
                    </span>
                )}
                {label && <span className="badge badge-info">{label}</span>}
                {note.file_size > 0 && (
                    <span className="badge badge-default">
                        {Math.round(note.file_size / 1024)} KB
                    </span>
                )}
                {note.ai_summary && (
                    <span className="badge badge-accent">✦ AI Summary</span>
                )}
            </div>

            {/* Actions */}
            <div className="note-card-actions">
                <Link
                    to={`/notes/${note.id}`}
                    className="btn btn-sm btn-secondary"
                    style={{ gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <EyeIcon /> View
                </Link>

                {note.has_file && (
                    <button
                        className="btn btn-sm btn-secondary"
                        style={{ gap: 4 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownload?.(note);
                        }}
                        disabled={downloading}
                    >
                        {downloading ? <Spinner size="sm" /> : <DownloadIcon />}
                        {downloading ? "" : "DL"}
                    </button>
                )}

                <button
                    className="btn btn-sm btn-danger"
                    style={{ gap: 4, marginLeft: "auto" }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(note);
                    }}
                    disabled={deleting}
                >
                    {deleting ? <Spinner size="sm" /> : <TrashIcon />}
                </button>
            </div>
        </div>
    );
}
