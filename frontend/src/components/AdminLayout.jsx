import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="app-layout">
            <AdminSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="app-main">
                <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
