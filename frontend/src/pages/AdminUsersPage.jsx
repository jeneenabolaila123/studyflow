import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { PageSpinner } from "../components/Spinner.jsx";

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return String(value);
    }
}

function RoleBadge({ isAdmin }) {
    return isAdmin ? (
        <span className="badge badge-accent">admin</span>
    ) : (
        <span className="badge badge-default">user</span>
    );
}

function StatusBadge({ status }) {
    if (status === "active") {
        return <span className="badge badge-success">active</span>;
    }
    return <span className="badge badge-warning">inactive</span>;
}

function Table({ columns, rows, emptyText }) {
    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "var(--color-bg)" }}>
                            {columns.map((c) => (
                                <th
                                    key={c}
                                    style={{
                                        textAlign: "left",
                                        padding: "12px 14px",
                                        fontSize: 11.5,
                                        letterSpacing: "0.02em",
                                        color: "var(--color-muted)",
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                        borderBottom: "1px solid var(--color-border)",
                                    }}
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: 18, color: "var(--color-muted)" }}>
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom:
                                            idx === rows.length - 1
                                                ? "none"
                                                : "1px solid var(--color-border)",
                                    }}
                                >
                                    {r.map((cell, j) => (
                                        <td
                                            key={j}
                                            style={{ padding: "12px 14px", verticalAlign: "top", whiteSpace: "nowrap" }}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
    });

    const [search, setSearch] = useState("");
    const [role, setRole] = useState("all");
    const [status, setStatus] = useState("all");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        is_admin: false,
        status: "active",
    });

    const page = pagination.current_page;

    const load = async (pageValue = page) => {
        setLoading(true);
        setError("");
        try {
            const params = {
                page: pageValue,
                per_page: pagination.per_page,
            };

            if (search.trim()) params.search = search.trim();
            if (role !== "all") params.is_admin = role === "admin";
            if (status !== "all") params.status = status;

            const res = await axiosClient.get("/admin/users", { params });
            const data = res.data?.data || {};

            setUsers(Array.isArray(data.users) ? data.users : []);
            setPagination(data.pagination || pagination);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load users.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            load(1);
        }, 350);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, role, status, pagination.per_page]);

    const openCreate = () => {
        setError("");
        setEditing(null);
        setForm({
            name: "",
            email: "",
            password: "",
            password_confirmation: "",
            is_admin: false,
            status: "active",
        });
        setFormOpen(true);
    };

    const openEdit = (u) => {
        setError("");
        setEditing(u);
        setForm({
            name: u?.name || "",
            email: u?.email || "",
            password: "",
            password_confirmation: "",
            is_admin: !!u?.is_admin,
            status: u?.status || "active",
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setEditing(null);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            if (!editing) {
                await axiosClient.post("/admin/users", {
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                    is_admin: !!form.is_admin,
                    status: form.status,
                });
            } else {
                const payload = {
                    name: form.name,
                    email: form.email,
                    is_admin: !!form.is_admin,
                    status: form.status,
                };

                if (form.password) {
                    payload.password = form.password;
                    payload.password_confirmation = form.password_confirmation;
                }

                await axiosClient.put(`/admin/users/${editing.id}`, payload);
            }

            setFormOpen(false);
            setEditing(null);
            await load(1);
        } catch (e2) {
            setError(e2?.response?.data?.message || "Failed to save user.");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (u) => {
        if (!confirm(`Delete user "${u?.name}"?`)) return;
        setError("");
        try {
            await axiosClient.delete(`/admin/users/${u.id}`);
            await load(1);
        } catch (e) {
            setError(e?.response?.data?.message || "Delete failed.");
        }
    };

    const toggleAdmin = async (u) => {
        setError("");
        try {
            await axiosClient.patch(`/admin/users/${u.id}/toggle-admin`);
            await load(page);
        } catch (e) {
            setError(e?.response?.data?.message || "Action failed.");
        }
    };

    const toggleStatus = async (u) => {
        setError("");
        try {
            await axiosClient.patch(`/admin/users/${u.id}/toggle-status`);
            await load(page);
        } catch (e) {
            setError(e?.response?.data?.message || "Action failed.");
        }
    };

    const headerRight = useMemo(
        () => (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" type="button" onClick={() => load(page)}>
                    Refresh
                </button>
                <button className="btn btn-primary" type="button" onClick={openCreate}>
                    Add user
                </button>
            </div>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [page]
    );

    if (loading) return <PageSpinner />;

    return (
        <div className="page-enter">
            <div
                className="page-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-desc">Manage accounts, roles, and status</p>
                </div>
                {headerRight}
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                        <label className="field-label">Search</label>
                        <input
                            className="input"
                            placeholder="Search by name or email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div className="field" style={{ marginBottom: 0, minWidth: 180, flex: "0 0 auto" }}>
                            <label className="field-label">Role</label>
                            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="all">All</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>

                        <div className="field" style={{ marginBottom: 0, minWidth: 180, flex: "0 0 auto" }}>
                            <label className="field-label">Status</label>
                            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="field" style={{ marginBottom: 0, minWidth: 180, flex: "0 0 auto" }}>
                            <label className="field-label">Per page</label>
                            <select
                                className="input"
                                value={pagination.per_page}
                                onChange={(e) =>
                                    setPagination((p) => ({ ...p, per_page: Number(e.target.value) || 10 }))
                                }
                            >
                                {[10, 15, 25, 50].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {formOpen ? (
                <div className="card" style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>
                            {editing ? "Edit user" : "Add user"}
                        </div>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={closeForm}>
                            Close
                        </button>
                    </div>

                    <form onSubmit={submit} style={{ marginTop: 12 }}>
                        <div className="field">
                            <label className="field-label">Name</label>
                            <input
                                className="input"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">Email</label>
                            <input
                                className="input"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <div className="field" style={{ marginBottom: 0, minWidth: 220, flex: "1 1 240px" }}>
                                <label className="field-label">Role</label>
                                <select
                                    className="input"
                                    value={form.is_admin ? "admin" : "user"}
                                    onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.value === "admin" }))}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="field" style={{ marginBottom: 0, minWidth: 220, flex: "1 1 240px" }}>
                                <label className="field-label">Status</label>
                                <select
                                    className="input"
                                    value={form.status}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
                            <div className="field" style={{ marginBottom: 0, minWidth: 220, flex: "1 1 240px" }}>
                                <label className="field-label">
                                    Password {editing ? "(leave blank to keep)" : ""}
                                </label>
                                <input
                                    className="input"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    required={!editing}
                                />
                            </div>

                            <div className="field" style={{ marginBottom: 0, minWidth: 220, flex: "1 1 240px" }}>
                                <label className="field-label">Confirm password</label>
                                <input
                                    className="input"
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, password_confirmation: e.target.value }))
                                    }
                                    required={!editing}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                            <button className="btn btn-secondary" type="button" onClick={closeForm} disabled={saving}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            <Table
                columns={["Name", "Email", "Role", "Status", "Created", "Actions"]}
                emptyText="No users found."
                rows={users.map((u) => [
                    <div key={u.id} style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                    </div>,
                    u.email,
                    <RoleBadge isAdmin={!!u.is_admin} />,
                    <StatusBadge status={u.status} />,
                    formatDate(u.created_at),
                    <div key={`${u.id}-actions`} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-sm btn-secondary" type="button" onClick={() => openEdit(u)}>
                            Edit
                        </button>
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleAdmin(u)}>
                            {u.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleStatus(u)}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => onDelete(u)}>
                            Delete
                        </button>
                    </div>,
                ])}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
                    Page {pagination.current_page} of {pagination.last_page} · {pagination.total} total
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={pagination.current_page <= 1}
                        onClick={() => load(pagination.current_page - 1)}
                    >
                        Prev
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={pagination.current_page >= pagination.last_page}
                        onClick={() => load(pagination.current_page + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
