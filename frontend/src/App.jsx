import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import NoteDetailsPage from "./pages/NoteDetailsPage.jsx";
import AiToolsPage from "./pages/AiToolsPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";

import { useAuth } from "./auth/AuthContext.jsx";

function App() {
    const { token } = useAuth();

    return (
        <Routes>
            {/* Root redirect */}
            <Route
                path="/"
                element={
                    <Navigate to={token ? "/dashboard" : "/login"} replace />
                }
            />

            {/* Public auth pages — full-screen, no sidebar */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Quiz page — full-screen, no sidebar for better focus */}
            <Route element={<ProtectedRoute />}>
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="/quiz/:id" element={<QuizPage />} />
            </Route>

            {/* Protected pages — wrapped in AppLayout (sidebar + topbar) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/notes/:id" element={<NoteDetailsPage />} />
                    <Route path="/ai-tools" element={<AiToolsPage />} />
                </Route>
            </Route>

            {/* 404 */}
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
                        <a href="/dashboard" style={{ color: "#6366f1" }}>
                            Go home
                        </a>
                    </div>
                }
            />
        </Routes>
    );
}

export default App;
