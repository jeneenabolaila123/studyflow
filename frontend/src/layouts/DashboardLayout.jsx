import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/home", label: "Home" },
  { to: "/document", label: "Document" },
  { to: "/quiz", label: "Quiz" },
  { to: "/revision", label: "Revision" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

function SidebarLink({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "block rounded-xl px-4 py-3 text-sm font-medium transition",
          isActive
            ? "bg-slate-900 text-white shadow"
            : "text-slate-700 hover:bg-slate-200 hover:text-slate-900",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-white p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Memma AI</h1>
            <p className="mt-2 text-sm text-slate-500">
              Turn your notes into quizzes instantly
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <SidebarLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}