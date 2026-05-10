import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../services/axiosClient";
import "./QuizPage.css";

const QUIZ_ACTIONS = [
    {
        key: "mcq",
        label: "Generate Quiz",
        className: "primary",
    },
    {
        key: "true_false",
        label: "True/False",
        className: "purple",
    },
    {
        key: "fill_blank",
        label: "Fill in the Blank",
        className: "green",
    },
];

function extractQuestions(data) {
    return (
        data?.questions ||
        data?.quiz?.questions ||
        data?.data?.questions ||
        data?.result?.questions ||
        []
    );
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Could not generate quiz."
    );
}

function getOptions(question) {
    const options = question?.options;

    if (Array.isArray(options)) {
        return options;
    }

    if (options && typeof options === "object") {
        return Object.entries(options).map(([key, value]) => `${key}. ${value}`);
    }

    return [];
}

export default function QuizPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeType, setActiveType] = useState("mcq");
    const [isGenerating, setIsGenerating] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [quiz, setQuiz] = useState(null);
    const [error, setError] = useState("");

    const uploadedName =
        location.state?.fileName ||
        location.state?.title ||
        "W7L1-Use Case (1).pdf";

    useEffect(() => {
        if (!isGenerating) return;

        setSeconds(0);

        const timer = setInterval(() => {
            setSeconds((current) => current + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isGenerating]);

    async function callGenerateEndpoint(payload) {
        const endpoints = [
            "/ai-tutor/generate-quiz",
            "/generate-quiz",
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                return await axiosClient.post(endpoint, payload, {
                    timeout: 700000,
                });
            } catch (error) {
                lastError = error;

                const status = error?.response?.status;

                if (status !== 404 && status !== 405) {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    async function handleGenerate(type) {
        setActiveType(type);
        setIsGenerating(true);
        setQuiz(null);
        setError("");

        try {
            const payload = {
                note_id: Number(id),
                quiz_type: type,
                type: type,
                difficulty: "mixed",
                questions_count: 5,
                total_questions: 5,
            };

            const response = await callGenerateEndpoint(payload);
            const questions = extractQuestions(response.data);

            setQuiz({
                type,
                questions,
                raw: response.data,
            });
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <main className="ai-tutor-page">
            <section className="ai-tutor-shell">
                <button
                    type="button"
                    className="back-link"
                    onClick={() => navigate(-1)}
                >
                    ← Back to Note
                </button>

                <header className="ai-tutor-header">
                    <h1>📚 AI Tutor – Smart Quiz Generator</h1>
                </header>

                <section className="upload-box">
                    <div className="upload-content">
                        <p className="upload-title">
                            📂 Drag &amp; drop a PDF/Word file here, or click to upload
                        </p>
                        <p className="uploaded-file">Uploaded: {uploadedName}</p>
                    </div>
                </section>

                <section className="chapters-section">
                    <h2>📘 Detected Chapters</h2>

                    <div className="chapter-card">
                        <div className="chapter-title">Chapter 5</div>

                        <div className="chapter-actions">
                            {QUIZ_ACTIONS.map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    className={`chapter-action ${action.className}`}
                                    disabled={isGenerating}
                                    onClick={() => handleGenerate(action.key)}
                                >
                                    {action.label}
                                </button>
                            ))}

                            {isGenerating && (
                                <button
                                    type="button"
                                    className="chapter-action danger"
                                    disabled
                                >
                                    Generating... ({seconds}s)
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="quiz-message error-message">
                        {error}
                    </div>
                )}

                {quiz && (
                    <section className="quiz-result">
                        <h2>
                            {activeType === "mcq" && "🧠 Generated Quiz"}
                            {activeType === "true_false" && "✅ True/False Quiz"}
                            {activeType === "fill_blank" && "📝 Fill in the Blank Quiz"}
                        </h2>

                        <p className="quiz-subtitle">
                            5 questions • Local quiz generation
                        </p>

                        {quiz.questions.length === 0 ? (
                            <p className="empty-result">
                                No questions returned from the backend.
                            </p>
                        ) : (
                            <div className="questions-list">
                                {quiz.questions.map((question, index) => (
                                    <article className="question-card" key={index}>
                                        <h3>
                                            Q{index + 1}:{" "}
                                            {question.question ||
                                                question.text ||
                                                question.prompt ||
                                                "Untitled question"}
                                        </h3>

                                        {activeType === "mcq" && (
                                            <div className="options-list">
                                                {getOptions(question).map((option, optionIndex) => (
                                                    <label
                                                        className="option-row"
                                                        key={optionIndex}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`question-${index}`}
                                                        />
                                                        <span>{option}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {activeType === "true_false" && (
                                            <div className="true-false-row">
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`question-${index}`}
                                                    />
                                                    True
                                                </label>

                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`question-${index}`}
                                                    />
                                                    False
                                                </label>
                                            </div>
                                        )}

                                        {activeType === "fill_blank" && (
                                            <input
                                                className="blank-input"
                                                type="text"
                                                placeholder="Your Answer"
                                            />
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}

                        {quiz.questions.length > 0 && (
                            <button type="button" className="submit-answers">
                                Submit Answers
                            </button>
                        )}
                    </section>
                )}

                <footer className="ai-tutor-footer">
                    © 2026 AI Tutor
                </footer>
            </section>
        </main>
    );
}