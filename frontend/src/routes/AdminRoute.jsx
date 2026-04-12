import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { PageSpinner } from "../components/Spinner.jsx";

export default function AdminRoute() {
    const { user, token, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <PageSpinner />;
    }

    if (!token) {
        return (
            <Navigate to="/login" replace state={{ from: location.pathname }} />
        );
    }

    if (!user?.is_admin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
