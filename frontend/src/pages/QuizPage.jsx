import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
const TOTAL = 10;

function normalizeQuestions(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((item) => {
            if (!item || typeof item !== "object") return null;

            const options = Array.isArray(item.options)
                ? item.options.map(String).filter(Boolean)
                : [];

            let answer = typeof item.answer === "string" ? item.answer : "";

            if (!answer && Number.isInteger(item.correct_index) && options[item.correct_index]) {
                answer = String(options[item.correct_index]);
            }

            if (!options.length || !item.question) return null;

            return {
                topic: item.topic || "General",
                question: String(item.question),
                options,
                answer,
            };
        })
        .filter(Boolean);
}

export default function QuizPage() {
    const { id } = useParams();

    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [notesError, setNotesError] = useState("");

    const [noteId, setNoteId] = useState(null);

    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [finished, setFinished] = useState(false);
    const [score, setScore] = useState(0);

    // RESET AI (best-effort)
    useEffect(() => {
        axiosClient.post("/ai/reset").catch(() => {});
    }, []);

    // Load notes for picker (also supports /quiz/:id preselect)
    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setNotesLoading(true);
            setNotesError("");
            setError("");

            try {
                const res = await axiosClient.get("/notes");
                const payload = res.data?.data;
                const list = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : [];

                if (!mounted) return;

                setNotes(list);

                if (!list.length) {
                    setNotesError("No notes found.");
                    setNoteId(null);
                    return;
                }

                const routeNoteId = id ? Number(id) : null;
                const routeIsValid = routeNoteId && Number.isFinite(routeNoteId);
                const inList = routeIsValid
                    ? list.some((n) => Number(n?.id) === routeNoteId)
                    : false;

                setNoteId(inList ? routeNoteId : list[0].id);
            } catch (err) {
                if (!mounted) return;
                setNotesError(err?.response?.data?.message || "Failed to load notes.");
                setNoteId(null);
            } finally {
                if (mounted) setNotesLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [id]);

    const questionsCount = questions.length;
    const lastIndex = Math.max(0, questionsCount - 1);

    const totalCount = useMemo(
        () => (questionsCount ? questionsCount : TOTAL),
        [questionsCount]
    );

    const q = questions[current] || null;
    const currentNumber = useMemo(() => current + 1, [current]);
    const selected = answers[current] ?? null;
    const isLast = questionsCount ? current >= lastIndex : true;

    const generateQuiz = async () => {
        if (!noteId) return;

        setLoading(true);
        setError("");

        setFinished(false);
        setScore(0);
        setCurrent(0);
        setAnswers({});

        try {
            const res = await axiosClient.post("/ai/quiz", {
                note_id: Number(noteId),
                count: TOTAL,
            });

            const rawQuestions = res.data?.data?.questions ?? res.data?.questions ?? [];
            const normalized = normalizeQuestions(rawQuestions);

            if (!normalized.length) {
                setQuestions([]);
                setError("No questions generated for this note.");
                return;
            }

            setQuestions(normalized);
        } catch (e) {
            setQuestions([]);
            setError(e?.response?.data?.message || "Failed to generate quiz.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate when note changes (so the picker drives the quiz)
    useEffect(() => {
        if (!noteId) return;
        generateQuiz();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId]);

    const selectAnswer = (opt) => {
        if (!questionsCount) return;
        if (finished) return;

        setAnswers((prev) => ({
            ...prev,
            [current]: opt,
        }));
    };

    const goPrev = () => setCurrent((c) => Math.max(0, c - 1));
    const goNext = () => {
        if (!questionsCount) return;
        setCurrent((c) => Math.min(lastIndex, c + 1));
    };

    const submit = async () => {
        if (!questionsCount) return;

        const results = questions.map((qq, index) => {
            const chosen = answers[index] ?? "";
            return {
                topic: qq?.topic || "General",
                selected_answer: chosen,
                correct_answer: qq?.answer || "",
            };
        });

        const computedScore = results.reduce((acc, r) => {
            if (r.selected_answer && r.selected_answer === r.correct_answer) return acc + 1;
            return acc;
        }, 0);

        setScore(computedScore);
        setFinished(true);

        axiosClient.post("/quiz-results", { results }).catch(() => {});
    };

    return (
        <div className="dashboard-page page-enter">
            <div className="page-header">
                <h1 className="page-title">Quiz</h1>
                <p className="page-desc">
                    Choose a note/PDF and answer questions like an exam.
                </p>
            </div>

            {notesError ? <div className="alert alert-error">{notesError}</div> : null}
            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="section-card">
                <div className="section-card-title">Quiz Settings</div>

                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <select
                        className="input"
                        value={noteId ?? ""}
                        onChange={(e) => setNoteId(Number(e.target.value))}
                        disabled={notesLoading || !notes.length || loading}
                        style={{ minWidth: 260, flex: 1 }}
                        aria-label="Select note"
                    >
                        {notes.map((n) => (
                            <option key={n.id} value={n.id}>
                                {n.title || `Note #${n.id}`}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={generateQuiz}
                        disabled={!noteId || notesLoading || loading}
                    >
                        {loading ? "Generating…" : "Generate Quiz"}
                    </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-muted)" }}>
                    {notesLoading
                        ? "Loading notes…"
                        : notes.length
                          ? `Target length: ${TOTAL} questions (AI may return fewer)`
                          : "Upload a note first to generate a quiz."}
                </div>
            </div>

            <div className="section-card" style={{ marginBottom: 14 }}>
                <div className="section-card-title">Exam</div>

                {!noteId && !notesLoading ? (
                    <div className="empty-state" style={{ padding: 12 }}>
                        <div className="empty-state-title">No note selected</div>
                        <div className="empty-state-desc">Select a note above to start.</div>
                    </div>
                ) : null}

                {noteId && !questionsCount && loading ? (
                    <div style={{ padding: 12, fontSize: 13, color: "var(--color-muted)" }}>
                        AI is generating your quiz…
                    </div>
                ) : null}

                {noteId && !questionsCount && !loading && !finished ? (
                    <div style={{ padding: 12, fontSize: 13, color: "var(--color-muted)" }}>
                        Click “Generate Quiz” to start.
                    </div>
                ) : null}

                {finished ? (
                    <div style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>
                            Submitted
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-muted)" }}>
                            Score:{" "}
                            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>
                                {score}
                            </span>{" "}
                            / {totalCount}
                        </div>

                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={generateQuiz}
                                disabled={loading}
                            >
                                {loading ? "Generating…" : "Try Again"}
                            </button>
                        </div>
                    </div>
                ) : q ? (
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "space-between",
                                gap: 10,
                            }}
                        >
                            <div>
                                <div className="quiz-num">Question {currentNumber}</div>
                                <div className="quiz-text" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                                    {currentNumber} / {questionsCount}
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: 12,
                                padding: 14,
                                borderRadius: 12,
                                border: "1px solid var(--color-border)",
                                background: "var(--color-bg)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "var(--color-text)",
                                    lineHeight: 1.5,
                                }}
                            >
                                {q.question}
                            </div>
                        </div>

                        <div
                            className="mt-4"
                            style={{ display: "flex", flexDirection: "column", gap: 10 }}
                        >
                            {(q.options || []).map((opt, i) => {
                                const isChosen = selected === opt;

                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => selectAnswer(opt)}
                                        disabled={loading}
                                        aria-pressed={isChosen}
                                        className="w-full"
                                        style={{
                                            textAlign: "left",
                                            padding: "12px 14px",
                                            borderRadius: 14,
                                            border: isChosen
                                                ? "2px solid var(--color-accent)"
                                                : "1px solid var(--color-sidebar)",
                                            background: "var(--color-sidebar)",
                                            color: "var(--color-card)",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            boxShadow: "var(--shadow-sm)",
                                            transition: "var(--transition)",
                                            opacity: loading ? 0.75 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (loading) return;
                                            e.currentTarget.style.background = "var(--color-sidebar-hover)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "var(--color-sidebar)";
                                        }}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            style={{
                                marginTop: 16,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={goPrev}
                                disabled={current === 0 || loading}
                            >
                                Previous
                            </button>

                            {isLast ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={submit}
                                    disabled={loading}
                                >
                                    Submit
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={goNext}
                                    disabled={loading}
                                >
                                    Next
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-muted)" }}>
                            Selected answers: {Object.keys(answers).length} / {questionsCount}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
