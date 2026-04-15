import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import NoteDetailsPage from "./pages/NoteDetailsPage.jsx";
import AiToolsPage from "./pages/AiToolsPage.jsx";
import RecommendationsPage from "./pages/RecommendationsPage.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import SummariesPage from "./pages/SummariesPage.jsx";
import SummaryDetailsPage from "./pages/SummaryDetailsPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminNotesPage from "./pages/AdminNotesPage.jsx";
import DocumentViewerPage from "./pages/DocumentViewerPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import DocumentFrame from "./pages/DocumentFrame.jsx";
import RevisionTab from "./pages/RevisionTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";
import QuizPage from "./pages/QuizPage.jsx";

import { useAuth } from "./auth/AuthContext.jsx";
import { Navigate, Route, Routes } from "react-router-dom"; 
import ExternalQuizPage from "./pages/ExternalQuizPage";
import HomePage from "./pages/HomePage";
function App() {
    const { token } = useAuth();

    return (
        <Routes>
            <Route path="/external-quiz" element={<ExternalQuizPage />} />
            <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/notes" element={<AdminNotesPage />} />
                </Route>
            </Route>

            <Route
                path="/"
                element={
                    token ? <Navigate to="/dashboard" replace /> : <LandingPage />
                }
            />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/notes/:id" element={<NoteDetailsPage />} />
                    <Route path="/summaries" element={<SummariesPage />} />
                    <Route path="/summaries/:id" element={<SummaryDetailsPage />} />
                    <Route path="/ai-tools" element={<AiToolsPage />} />
                    <Route path="/document" element={<DocumentFrame />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/revision" element={<RevisionTab />} />
                    <Route path="/settings-tab" element={<SettingsTab />} />
                    <Route path="/document-viewer" element={<DocumentViewerPage />} />
                    <Route path="/recommendations" element={<RecommendationsPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/quiz/:id" element={<QuizPage />} />
                </Route>
            </Route>

            <Route
                path="*"
                element={
                    <div
                        style={{
                            padding: 40,
                            textAlign: "center",
                            color: "#6b7280",
                        }}
                    >
                        Page not found.{" "}
                        <a href="/" style={{ color: "#6366f1" }}>
                            Go home
                        </a>
                    </div>
                }
            />
        </Routes>
    );
}

export default App;