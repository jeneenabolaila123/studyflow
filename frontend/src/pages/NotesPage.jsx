import { useCallback, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import NoteCard from "../components/NoteCard.jsx";
import NoteForm from "../components/NoteForm.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

function PlusIcon() {
    return (
        <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
            />
        </svg>
    );
}
function SearchIcon() {
    return (
        <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
    );
}

export default function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosClient.get("/notes");
            setNotes(res.data?.data || []);
        } catch (err) {
            const status = err?.response?.status;
            if (status !== 401)
                setError(
                    err?.response?.data?.message || "Failed to load notes."
                );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (note) => {
        if (!confirm(`Delete "${note.title}"?`)) return;
        setDeletingId(note.id);
        try {
            await axiosClient.delete(`/notes/${note.id}`);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
        } catch (err) {
            alert(err?.response?.data?.message || "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = async (note) => {
        setDownloadingId(note.id);
        try {
            const res = await axiosClient.get(`/notes/${note.id}/download`, {
                responseType: "blob",
            });
            const blob = new Blob([res.data], {
                type: res.headers?.["content-type"] || "application/pdf",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = note.original_filename || `note-${note.id}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(err?.response?.data?.message || "Download failed.");
        } finally {
            setDownloadingId(null);
        }
    };

    const filtered = notes.filter(
        (n) =>
            n.title?.toLowerCase().includes(search.toLowerCase()) ||
            n.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-enter">
            {/* Header */}
            <div
                className="page-header"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <div>
                    <h1 className="page-title">My Notes</h1>
                    <p className="page-desc">
                        {notes.length} note{notes.length !== 1 ? "s" : ""} in
                        your library
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    style={{ gap: 6, flexShrink: 0 }}
                    onClick={() => setShowForm((prev) => !prev)}
                >
                    <PlusIcon />
                    {showForm ? "Close form" : "New Note"}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Create form (expandable) */}
            {showForm && (
                <div
                    className="section-card"
                    style={{
                        marginBottom: 20,
                        animation: "fadeInUp 0.25s ease both",
                    }}
                >
                    <div className="section-card-title">
                        <PlusIcon /> Create a new note
                    </div>
                    <NoteForm
                        onCreated={() => {
                            setShowForm(false);
                            load();
                        }}
                    />
                </div>
            )}

            {/* Search bar */}
            {notes.length > 0 && (
                <div
                    style={{
                        position: "relative",
                        marginBottom: 20,
                        maxWidth: 340,
                    }}
                >
                    <span
                        style={{
                            position: "absolute",
                            left: 11,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--color-muted)",
                            pointerEvents: "none",
                        }}
                    >
                        <SearchIcon />
                    </span>
                    <input
                        className="input"
                        style={{ paddingLeft: 34 }}
                        placeholder="Search notes…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Notes grid */}
            {loading ? (
                <PageSpinner />
            ) : filtered.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg
                                width="48"
                                height="48"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                opacity="0.3"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <div className="empty-state-title">
                            {search
                                ? "No notes match your search"
                                : "No notes yet"}
                        </div>
                        <div className="empty-state-desc">
                            {search
                                ? "Try a different search term."
                                : 'Click "New Note" above to upload a PDF, paste text, or add a .txt file.'}
                        </div>
                        {!search && (
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ gap: 5 }}
                                onClick={() => setShowForm(true)}
                            >
                                <PlusIcon /> Create your first note
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="notes-grid">
                    {filtered.map((note, i) => (
                        <div
                            key={note.id}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            <NoteCard
                                note={note}
                                onDelete={handleDelete}
                                onDownload={handleDownload}
                                deleting={deletingId === note.id}
                                downloading={downloadingId === note.id}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
