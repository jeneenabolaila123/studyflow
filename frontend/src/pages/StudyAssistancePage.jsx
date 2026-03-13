import { useState } from "react";
import axiosClient from "../api/axiosClient";

// ─── Icons ──────────────────────────────────────────────────────────
function GlobeIcon() {
    return (
        <svg
            width="28"
            height="28"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    );
}
function SearchIcon() {
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
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
            />
        </svg>
    );
}

function AiThinking({ label = "AI is thinking" }) {
    return (
        <span className="ai-thinking" style={{ color: "var(--color-accent)" }}>
            <span className="ai-thinking-icon">✦</span>
            {label}
            <span className="ai-thinking-dots">
                <span />
                <span />
                <span />
            </span>
        </span>
    );
}

// ─── A list of commonly searched countries ────────────────────────
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Argentina", "Australia",
    "Austria", "Bangladesh", "Belgium", "Brazil", "Canada",
    "Chile", "China", "Colombia", "Czech Republic", "Denmark",
    "Egypt", "Ethiopia", "Finland", "France", "Germany",
    "Ghana", "Greece", "Hungary", "India", "Indonesia",
    "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Japan", "Jordan", "Kenya", "Malaysia", "Mexico",
    "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway",
    "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
    "Romania", "Russia", "Saudi Arabia", "Senegal", "Singapore",
    "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden",
    "Switzerland", "Tanzania", "Thailand", "Tunisia", "Turkey",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
    "United States", "Vietnam", "Zimbabwe",
];

// ─── Page ────────────────────────────────────────────────────────────
export default function StudyAssistancePage() {
    const [country, setCountry] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [searched, setSearched] = useState("");

    const handleInput = (e) => {
        const val = e.target.value;
        setCountry(val);
        setResult("");
        setError("");
        if (val.trim().length > 0) {
            const filtered = COUNTRIES.filter((c) =>
                c.toLowerCase().startsWith(val.trim().toLowerCase())
            );
            setSuggestions(filtered.slice(0, 6));
        } else {
            setSuggestions([]);
        }
    };

    const selectSuggestion = (c) => {
        setCountry(c);
        setSuggestions([]);
    };

    const search = async () => {
        const trimmed = country.trim();
        if (!trimmed || loading) return;
        setSuggestions([]);
        setError("");
        setResult("");
        setLoading(true);
        setSearched(trimmed);

        try {
            const res = await axiosClient.post("/ai/study-assistance", {
                country: trimmed,
            });
            setResult(res.data?.data?.result || "");
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429)
                setError("Too many requests. Please wait and try again.");
            else if (status === 422)
                setError(
                    err?.response?.data?.message || "Invalid input."
                );
            else
                setError(
                    err?.response?.data?.message ||
                        "Failed to fetch study assistance info."
                );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            search();
        }
    };

    return (
        <div className="study-assistance-page dash-fade-in">
            {/* Header */}
            <div className="ai-tools-header">
                <div className="ai-tools-header-badge">
                    <span>🌍 Powered by Ollama AI</span>
                </div>
                <h1 className="ai-tools-title">Study Assistance by Country</h1>
                <p className="ai-tools-subtitle">
                    Select a country to discover scholarships, grants, loans,
                    and learning resources available to students.
                </p>
            </div>

            {/* Search card */}
            <div className="section-card" style={{ marginBottom: 24 }}>
                <div className="study-assistance-search-row">
                    <div className="study-assistance-input-wrap">
                        <span className="study-assistance-input-icon">
                            <GlobeIcon />
                        </span>
                        <input
                            className="input study-assistance-input"
                            placeholder="Type a country name…"
                            value={country}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                            <ul className="study-assistance-suggestions">
                                {suggestions.map((c) => (
                                    <li
                                        key={c}
                                        className="study-assistance-suggestion-item"
                                        onMouseDown={() => selectSuggestion(c)}
                                    >
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        className="btn btn-primary study-assistance-search-btn"
                        onClick={search}
                        disabled={loading || !country.trim()}
                    >
                        {loading ? (
                            <AiThinking label="Searching" />
                        ) : (
                            <>
                                <SearchIcon />
                                Find Programs
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="section-card study-assistance-result-card">
                    <div className="study-assistance-result-header">
                        <span className="study-assistance-result-flag">🎓</span>
                        <div>
                            <div className="study-assistance-result-title">
                                Study Assistance in {searched}
                            </div>
                            <div className="study-assistance-result-sub">
                                Powered by Ollama AI · Results may vary
                            </div>
                        </div>
                    </div>

                    <div className="study-assistance-result-body">
                        {result}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
                <div className="section-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: 16,
                            marginBottom: 8,
                            color: "var(--color-text)",
                        }}
                    >
                        Search any country to get started
                    </div>
                    <div
                        style={{
                            fontSize: 14,
                            color: "var(--color-muted)",
                            maxWidth: 400,
                            margin: "0 auto",
                        }}
                    >
                        Enter a country name above and click{" "}
                        <strong>Find Programs</strong> to discover available
                        scholarships, grants, and study resources.
                    </div>
                </div>
            )}
        </div>
    );
}
