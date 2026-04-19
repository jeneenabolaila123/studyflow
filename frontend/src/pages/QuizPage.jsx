import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
const BATCH_SIZE = 3;

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
    const [answers, setAnswers] = useState({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [finished, setFinished] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        axiosClient.post("/ai/reset").catch(() => {});
    }, []);

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

    const generateQuiz = async (isAppending = false) => {
        if (!noteId) return;

        setLoading(true);
        setError("");

        if (!isAppending) {
            setFinished(false);
            setScore(0);
            setAnswers({});
            setQuestions([]);
        }

        try {
            const previousQuestions = isAppending ? questions.map(q => q.question) : [];
            const usedTopics = isAppending ? questions.map(q => q.topic).filter(Boolean) : [];

            const res = await axiosClient.post("/ai/quiz", {
                note_id: Number(noteId),
                count: BATCH_SIZE,
                previous_questions: previousQuestions,
                used_topics: usedTopics
            });

            const rawQuestions = res.data?.data?.questions ?? res.data?.questions ?? [];
            const normalized = normalizeQuestions(rawQuestions);

            if (!normalized.length) {
                if (!isAppending) setQuestions([]);
                setError("No questions generated for this note.");
                return;
            }

            setQuestions(prev => isAppending ? [...prev, ...normalized] : normalized);
        } catch (e) {
            if (!isAppending) setQuestions([]);
            setError(e?.response?.data?.message || "Failed to generate quiz.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!noteId) return;
        generateQuiz(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId]);

    const selectAnswer = (index, opt) => {
        if (!questionsCount) return;
        if (finished) return;

        setAnswers((prev) => ({
            ...prev,
            [index]: opt,
        }));
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
            {error ? <div className="alert alert-error mb-4">{error}</div> : null}

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
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-muted)" }}>
                    {notesLoading
                        ? "Loading notes..."
                        : notes.length
                          ? `Generating in batches of ${BATCH_SIZE} questions.`
                          : "Upload a note first to generate a quiz."}
                </div>
            </div>

            <div className="section-card" style={{ marginBottom: 14 }}>
                <div className="section-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Exam</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => generateQuiz(false)}
                            disabled={!noteId || notesLoading || loading}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                        >
                            {loading && questions.length === 0 ? "Generating..." : "Generate New Quiz"}
                        </button>
                        {questionsCount > 0 && !finished && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => generateQuiz(true)}
                                disabled={loading || finished}
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                            >
                                {loading && questions.length > 0 ? "Adding..." : "Generate 3 More Questions"}
                            </button>
                        )}
                    </div>
                </div>

                {!noteId && !notesLoading ? (
                    <div className="empty-state" style={{ padding: 12 }}>
                        <div className="empty-state-title">No note selected</div>
                        <div className="empty-state-desc">Select a note above to start.</div>
                    </div>
                ) : null}

                {noteId && !questionsCount && loading ? (
                    <div style={{ padding: 12, fontSize: 13, color: "var(--color-muted)" }}>
                        AI is generating your quiz...
                    </div>
                ) : null}

                {noteId && !questionsCount && !loading && !finished ? (
                    <div style={{ padding: 12, fontSize: 13, color: "var(--color-muted)" }}>
                        Ready to start. Click Generate.
                    </div>
                ) : null}

                {finished ? (
                    <div style={{ padding: "20px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>
                            Quiz Completed!
                        </div>
                        <div style={{ fontSize: 16, color: "var(--color-muted)" }}>
                            Score:{" "}
                            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>
                                {score}
                            </span>{" "}
                            / {questionsCount}
                        </div>

                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => generateQuiz(false)}
                                disabled={loading}
                            >
                                {loading ? "Generating..." : "Try Again (New Quiz)"}
                            </button>
                        </div>
                    </div>
                ) : questionsCount > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {questions.map((q, current) => {
                            const currentNumber = current + 1;
                            const selected = answers[current] ?? null;

                            return (
                                <div key={current} style={{ paddingBottom: "16px", borderBottom: current === questionsCount - 1 ? "none" : "1px solid var(--color-border)" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-end",
                                            justifyContent: "space-between",
                                            gap: 10,
                                        }}
                                    >
                                        <div>
                                            <div className="quiz-num" style={{ fontWeight: "bold" }}>Question {currentNumber}</div>
                                            {q.topic && (
                                                <div className="quiz-text" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                                                    Topic: {q.topic}
                                                </div>
                                            )}
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
                                                fontWeight: 500,
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
                                                    onClick={() => selectAnswer(current, opt)}
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
                                                        background: isChosen ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
                                                        color: "var(--color-card)",
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        boxShadow: "var(--shadow-sm)",
                                                        transition: "var(--transition)",
                                                        opacity: loading ? 0.8 : 1,
                                                        cursor: loading ? "not-allowed" : "pointer"
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        <div
                            style={{
                                marginTop: 16,
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                alignItems: "center"
                            }}
                        >
                            <div style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: "bold" }}>
                                Answered: {Object.keys(answers).length} / {questionsCount}
                            </div>
                            
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={submit}
                                disabled={loading || Object.keys(answers).length === 0}
                                style={{ minWidth: 200, padding: "10px 0" }}
                            >
                                Submit All Answers
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
