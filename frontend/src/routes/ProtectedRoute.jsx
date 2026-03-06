import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

export default function ProtectedRoute() {
    const { token, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <PageSpinner />;
    }

    if (!token) {
        return (
            <Navigate to="/login" replace state={{ from: location.pathname }} />
        );
    }

    return <Outlet />;
}
