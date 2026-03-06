<<<<<<< HEAD
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../auth/AuthContext.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

// ---- Icons -------------------------------------------------------
function NotesIcon() {
    return (
        <svg
            width="18"
            height="18"
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

function SparklesIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    );
}

function FilesIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
        </svg>
    );
}

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

function ArrowRightIcon() {
    return (
        <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
            />
        </svg>
    );
}

// ------------------------------------------------------------------

// Animated counter
function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);
    const raf = useRef(null);

    useEffect(() => {
        cancelAnimationFrame(raf.current);

        const start = performance.now();
        const startValue = 0;

        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setValue(Math.round(startValue + eased * (target - startValue)));

            if (progress < 1) {
                raf.current = requestAnimationFrame(tick);
            }
        };

        raf.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);

    return value;
}

function StatCard({ icon, iconClass, value, label }) {
    const animated = useCountUp(value);

    return (
        <div className="stat-card">
            <div className={`stat-icon ${iconClass}`}>{icon}</div>
            <div className="stat-value">{animated}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function RecentNoteRow({ note }) {
    const label = note.mime_type?.includes("pdf")
        ? "PDF"
        : note.source_type === "text"
        ? "Text"
        : note.source_type?.includes("txt")
        ? "TXT"
        : "Note";

    return (
        <div className="recent-note">
            <div className="recent-note-left">
                <NotesIcon />
            </div>

            <div className="recent-note-content">
                <div className="recent-note-title">{note.title}</div>

                <div className="recent-note-meta">
                    <span className="badge badge-default">{label}</span>

                    {note.ai_summary && (
                        <span className="badge badge-accent">AI</span>
                    )}
                </div>
            </div>

            <Link to={`/notes/${note.id}`} className="btn btn-sm btn-ghost">
                View <ArrowRightIcon />
            </Link>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const res = await axiosClient.get("/notes");
            setNotes(res.data?.data || []);
        } catch (err) {
            const status = err?.response?.status;

            if (status !== 401) {
                setError(
                    err?.response?.data?.message || "Failed to load notes."
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalNotes = notes.length;
    const aiSummaries = notes.filter((n) => n.ai_summary).length;
    const filesUploaded = notes.filter((n) => n.has_file).length;

    const firstName = user?.name?.split(" ")[0] || "there";

    if (loading) {
        return <PageSpinner />;
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1>Good day, {firstName} 👋</h1>
                <p>Your AI study dashboard.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Stats */}
            <div className="stats-grid">
                <StatCard
                    icon={<NotesIcon />}
                    iconClass="stat-icon-purple"
                    value={totalNotes}
                    label="Total Notes"
                />

                <StatCard
                    icon={<SparklesIcon />}
                    iconClass="stat-icon-blue"
                    value={aiSummaries}
                    label="AI Summaries"
                />

                <StatCard
                    icon={<FilesIcon />}
                    iconClass="stat-icon-green"
                    value={filesUploaded}
                    label="Files Uploaded"
                />
            </div>

            <div className="dashboard-body">
                <div className="section-card">
                    <div className="section-card-title">Recent Notes</div>

                    {notes.length === 0 ? (
                        <div className="empty-state">
                            <p>No notes yet.</p>

                            <Link to="/notes" className="btn btn-primary">
                                <PlusIcon /> Add first note
                            </Link>
                        </div>
                    ) : (
                        <>
                            {notes.slice(0, 8).map((note) => (
                                <RecentNoteRow key={note.id} note={note} />
                            ))}
                        </>
                    )}
                </div>

                <div className="section-card">
                    <div className="section-card-title">Quick Actions</div>

                    <Link to="/notes" className="btn btn-primary">
                        <PlusIcon /> New Note
                    </Link>

                    <Link to="/notes" className="btn btn-secondary">
                        <NotesIcon /> All Notes
                    </Link>
                </div>
            </div>
        </div>
    );
}
=======
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import NoteForm from "../components/NoteForm.jsx";

export default function DashboardPage() {

  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [txtFile, setTxtFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {

    try {

      const res = await axiosClient.get("/notes");
      setNotes(res.data?.data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    load();

  }, [load]);

  return (

    <div className="row">

      {/* LEFT SIDE */}
      <div className="col">

        <h2>Study Assistant</h2>

        {loading ? (
          <div className="card">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="card">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div className="card" key={n.id}>
              <h4>{n.title}</h4>
              <Link to={`/notes/${n.id}`}>View</Link>
            </div>
          ))
        )}

        <hr />

        <h3>Add Note (Optional)</h3>

        <textarea
          placeholder="Write or paste your note text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <br /><br />

        <label>TXT file</label>

        <input
          type="file"
          accept=".txt"
          onChange={(e) => setTxtFile(e.target.files[0])}
        />

        <br /><br />

       
      </div>

      {/* RIGHT SIDE */}
      <div className="col">

        <h3>Upload</h3>

        <NoteForm onCreated={load} />

      </div>

    </div>

  );
}
>>>>>>> 065b279834815d71e3aec024460b739dd59d9809
