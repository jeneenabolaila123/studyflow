import { Link } from "react-router-dom";

function QuizCard({ icon, title, text }) {
    return (
        <div className="quiz-admin-card">
            <div className="quiz-admin-icon">{icon}</div>
            <div>
                <h3>{title}</h3>
                <p>{text}</p>
            </div>
        </div>
    );
}

export default function AdminQuizManagementPage() {
    return (
        <div className="quiz-admin-page">
            <style>{`
                .quiz-admin-page {
                    min-height: 100%;
                    padding: 24px;
                    background:
                        radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 30%),
                        linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
                    color: #172033;
                }

                .quiz-admin-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .quiz-admin-kicker {
                    margin: 0 0 5px;
                    color: #64748b;
                    font-size: 14px;
                    font-weight: 700;
                }

                .quiz-admin-top h1 {
                    margin: 0;
                    font-size: 30px;
                    color: #0f172a;
                    font-weight: 950;
                }

                .quiz-admin-back {
                    text-decoration: none;
                    background: #ffffff;
                    color: #1d4ed8;
                    padding: 12px 16px;
                    border-radius: 14px;
                    font-weight: 850;
                    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
                    transition: 0.2s ease;
                }

                .quiz-admin-back:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
                }

                .quiz-admin-hero {
                    position: relative;
                    overflow: hidden;
                    border-radius: 28px;
                    padding: 30px 24px;
                    margin-bottom: 20px;
                    color: white;
                    background: linear-gradient(135deg, #f97316 0%, #fb923c 55%, #facc15 100%);
                    box-shadow: 0 18px 38px rgba(249, 115, 22, 0.24);
                }

                .quiz-admin-hero::after {
                    content: "";
                    position: absolute;
                    width: 180px;
                    height: 180px;
                    right: -60px;
                    bottom: -70px;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.18);
                }

                .quiz-admin-hero h2 {
                    position: relative;
                    z-index: 2;
                    margin: 0;
                    font-size: clamp(34px, 5vw, 58px);
                    line-height: 1;
                    font-weight: 950;
                    text-transform: uppercase;
                    text-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
                }

                .quiz-admin-hero p {
                    position: relative;
                    z-index: 2;
                    max-width: 720px;
                    margin: 14px 0 0;
                    font-size: 17px;
                    line-height: 1.7;
                    color: rgba(255, 255, 255, 0.94);
                    font-weight: 650;
                }

                .quiz-admin-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 18px;
                    margin-bottom: 20px;
                }

                .quiz-admin-card {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid rgba(148, 163, 184, 0.22);
                    border-radius: 24px;
                    padding: 22px;
                    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
                }

                .quiz-admin-icon {
                    display: grid;
                    place-items: center;
                    width: 58px;
                    height: 58px;
                    border-radius: 18px;
                    background: #ffedd5;
                    font-size: 30px;
                    flex: 0 0 auto;
                }

                .quiz-admin-card h3 {
                    margin: 0 0 8px;
                    color: #0f172a;
                    font-size: 20px;
                    font-weight: 950;
                }

                .quiz-admin-card p {
                    margin: 0;
                    color: #64748b;
                    line-height: 1.6;
                    font-size: 14px;
                    font-weight: 650;
                }

                .quiz-admin-section {
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid rgba(148, 163, 184, 0.22);
                    border-radius: 24px;
                    padding: 22px;
                    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
                }

                .quiz-admin-section h2 {
                    margin: 0 0 16px;
                    color: #164b8f;
                    font-size: 24px;
                    font-weight: 950;
                }

                .quiz-admin-table-wrap {
                    overflow-x: auto;
                    border-radius: 18px;
                    border: 1px solid #e2e8f0;
                }

                .quiz-admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 680px;
                }

                .quiz-admin-table th {
                    text-align: left;
                    padding: 13px 14px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 12px;
                    text-transform: uppercase;
                }

                .quiz-admin-table td {
                    padding: 14px;
                    border-top: 1px solid #e2e8f0;
                    color: #334155;
                    font-size: 14px;
                    font-weight: 700;
                }

                .quiz-admin-pill {
                    display: inline-flex;
                    padding: 6px 11px;
                    border-radius: 999px;
                    background: #dcfce7;
                    color: #15803d;
                    font-weight: 950;
                    font-size: 12px;
                }

                @media (max-width: 900px) {
                    .quiz-admin-grid {
                        grid-template-columns: 1fr;
                    }

                    .quiz-admin-top {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .quiz-admin-back {
                        width: 100%;
                        text-align: center;
                    }
                }
            `}</style>

            <div className="quiz-admin-top">
                <div>
                    <p className="quiz-admin-kicker">Admin control panel</p>
                    <h1>Quiz Management</h1>
                </div>

                <Link to="/admin" className="quiz-admin-back">
                    ← Back to Admin Dashboard
                </Link>
            </div>

            <section className="quiz-admin-hero">
                <h2>Quiz Management</h2>
                <p>
                    View, edit, and regenerate quizzes generated inside StudyFlow.
                    Use this area to monitor quiz activity and keep quiz content organized.
                </p>
            </section>

            <section className="quiz-admin-grid">
                <QuizCard
                    icon="✅"
                    title="View / Edit Quizzes"
                    text="Review generated quizzes, check quiz details, and manage quiz content from the admin side."
                />

                <QuizCard
                    icon="🔁"
                    title="Regenerate Quizzes"
                    text="Regenerate quiz content when questions need to be refreshed or improved."
                />
            </section>

            <section className="quiz-admin-section">
                <h2>Quiz Overview</h2>

                <div className="quiz-admin-table-wrap">
                    <table className="quiz-admin-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Description</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>View / Edit Quizzes</td>
                                <td>Admin can review generated quizzes and manage quiz content.</td>
                                <td>
                                    <span className="quiz-admin-pill">Ready</span>
                                </td>
                            </tr>

                            <tr>
                                <td>Regenerate Quizzes</td>
                                <td>Admin can refresh quiz output when needed.</td>
                                <td>
                                    <span className="quiz-admin-pill">Ready</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}