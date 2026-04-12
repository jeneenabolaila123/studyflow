import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient.js';

import { Alert, Badge, Button, Card, InputField, Loader } from '../components/ui/UIComponents.jsx';
import { ConfirmDialog, EmptyState, Modal, StatCard } from '../components/ui/AdvancedComponents.jsx';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

function firstError(errors, key) {
  const value = errors?.[key];
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return String(value);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | admin | user
  const [verifiedFilter, setVerifiedFilter] = useState('all'); // all | verified | unverified
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive | suspended
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    is_admin: false,
    status: 'active',
    password: '',
    password_confirmation: '',
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await axiosClient.get('/admin/stats');
      setStats(res?.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load admin stats.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const buildUsersParams = useCallback(
    (pageValue) => {
      const params = {
        page: pageValue,
        per_page: perPage,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      if (searchDebounced) params.search = searchDebounced;
      if (roleFilter !== 'all') params.is_admin = roleFilter === 'admin';
      if (verifiedFilter !== 'all') params.verified = verifiedFilter === 'verified';
      if (statusFilter !== 'all') params.status = statusFilter;

      return params;
    },
    [perPage, roleFilter, verifiedFilter, statusFilter, sortBy, sortDir, searchDebounced]
  );

  const loadUsers = useCallback(
    async (pageValue = page) => {
      setLoadingUsers(true);
      try {
        const res = await axiosClient.get('/admin/users', {
          params: buildUsersParams(pageValue),
        });

        const payload = res?.data?.data;
        const rawUsers = payload?.users;
        const list = Array.isArray(rawUsers) ? rawUsers : rawUsers?.data || [];
        const meta = payload?.pagination || null;

        setUsers(list);
        if (meta) {
          setPagination(meta);
          setPage(meta.current_page || pageValue);
        } else {
          setPagination((prev) => ({ ...prev, current_page: pageValue }));
          setPage(pageValue);
        }
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load users.');
      } finally {
        setLoadingUsers(false);
      }
    },
    [buildUsersParams, page]
  );

  useEffect(() => {
    setError('');
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    setError('');
    setPage(1);
    void loadUsers(1);
  }, [perPage, roleFilter, verifiedFilter, statusFilter, sortBy, sortDir, searchDebounced, loadUsers]);

  const statCards = useMemo(() => {
    const totalUsers = stats?.total_users ?? 0;
    const verifiedUsers = stats?.verified_users ?? 0;
    const unverifiedUsers = stats?.unverified_users ?? Math.max(0, totalUsers - verifiedUsers);

    return [
      {
        title: 'Total Users',
        value: totalUsers,
        icon: '👥',
        color: 'blue',
        trend: `${pagination?.total ?? totalUsers} in system`,
      },
      {
        title: 'Active Users',
        value: stats?.active_users ?? 0,
        icon: '⚡',
        color: 'green',
        trend: 'Status: active',
      },
      {
        title: 'Verified',
        value: verifiedUsers,
        icon: '✅',
        color: 'purple',
        trend: `${unverifiedUsers} pending`,
      },
      {
        title: 'Admins',
        value: stats?.admin_users ?? 0,
        icon: '🛡️',
        color: 'orange',
        trend: 'Role-based access',
      },
    ];
  }, [pagination?.total, stats]);

  const badgeForStatus = (value) => {
    if (value === 'active') return 'success';
    if (value === 'suspended') return 'danger';
    return 'warning';
  };

  const openCreateUser = () => {
    setError('');
    setFormErrors({});
    setUserModalMode('create');
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      is_admin: false,
      status: 'active',
      password: '',
      password_confirmation: '',
    });
    setUserModalOpen(true);
  };

  const openEditUser = (user) => {
    setError('');
    setFormErrors({});
    setUserModalMode('edit');
    setEditingUser(user);
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      is_admin: !!user?.is_admin,
      status: user?.status || 'active',
      password: '',
      password_confirmation: '',
    });
    setUserModalOpen(true);
  };

  const closeUserModal = () => {
    if (savingUser) return;
    setUserModalOpen(false);
    setEditingUser(null);
    setFormErrors({});
  };

  const submitUser = async (e) => {
    e?.preventDefault?.();
    setSavingUser(true);
    setError('');
    setFormErrors({});

    try {
      if (userModalMode === 'create') {
        await axiosClient.post('/admin/users', {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          is_admin: !!form.is_admin,
          status: form.status,
          password: form.password,
          password_confirmation: form.password_confirmation,
        });
      } else if (editingUser?.id) {
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          is_admin: !!form.is_admin,
          status: form.status,
        };

        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }

        await axiosClient.put(`/admin/users/${editingUser.id}`, payload);
      }

      setUserModalOpen(false);
      setEditingUser(null);
      await Promise.all([loadStats(), loadUsers(page)]);
    } catch (e2) {
      const resp = e2?.response?.data;
      if (resp?.errors && typeof resp.errors === 'object') {
        setFormErrors(resp.errors);
      }
      setError(resp?.message || 'Failed to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  const requestDeleteUser = (user) => {
    setError('');
    setDeletingUser(user);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (deleting) return;
    if (!deletingUser?.id) return;
    setDeleting(true);
    setError('');
    try {
      await axiosClient.delete(`/admin/users/${deletingUser.id}`);
      setConfirmDeleteOpen(false);
      setDeletingUser(null);
      await Promise.all([loadStats(), loadUsers(Math.max(1, page))]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const refresh = async () => {
    setError('');
    await Promise.all([loadStats(), loadUsers(page)]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest text-slate-400">Admin</div>
              <h1 className="mt-2 text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Manage users, roles, and statuses using the protected admin API.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={refresh} disabled={loadingStats || loadingUsers}>
                ↻ Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={openCreateUser}>
                ＋ Add User
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div>
            <Alert type="error" title="Something went wrong" message={error} showIcon />
          </div>
        ) : null}

        <div>
          <h2 className="text-2xl font-bold text-white">Overview</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {loadingStats ? (
              <Card className="bg-slate-900/80 border border-white/10 text-white">
                <div className="flex items-center justify-center py-10">
                  <Loader />
                </div>
              </Card>
            ) : (
              statCards.map((c) => (
                <div key={c.title} className="transition-transform duration-300 hover:-translate-y-1">
                  <StatCard title={c.title} value={c.value} icon={c.icon} color={c.color} trend={c.trend} />
                </div>
              ))
            )}
          </div>
        </div>

        <Card className="bg-slate-900/80 border border-white/10 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Users</h2>
              <p className="mt-1 text-sm text-slate-400">Search, filter, and manage user accounts.</p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
              <div className="sm:col-span-2">
                <InputField
                  placeholder="Search name, email, or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950/40 border-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-2xl border-2 border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                <option value="all">All roles</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
              </select>

              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full rounded-2xl border-2 border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                <option value="all">All verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-2xl border-2 border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value) || 15)}
                className="w-full rounded-2xl border-2 border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                {[10, 15, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>

              <select
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [sb, sd] = e.target.value.split(':');
                  setSortBy(sb);
                  setSortDir(sd);
                }}
                className="w-full rounded-2xl border-2 border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
              >
                <option value="created_at:desc">Newest</option>
                <option value="created_at:asc">Oldest</option>
                <option value="name:asc">Name A → Z</option>
                <option value="name:desc">Name Z → A</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-10">
                <Loader />
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No users found"
                description="Try adjusting your search or filters."
                action={
                  <Button variant="primary" size="sm" onClick={openCreateUser}>
                    Add a user
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/30">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-950/40 text-slate-300">
                      <tr>
                        <th className="px-6 py-4 font-semibold">User</th>
                        <th className="hidden px-6 py-4 font-semibold md:table-cell">Role</th>
                        <th className="hidden px-6 py-4 font-semibold lg:table-cell">Status</th>
                        <th className="hidden px-6 py-4 font-semibold lg:table-cell">Verified</th>
                        <th className="hidden px-6 py-4 font-semibold xl:table-cell">Joined</th>
                        <th className="px-6 py-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-white/90">
                                {(u?.name || 'U')?.slice(0, 1)?.toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {u.name}{' '}
                                  <span className="text-xs font-medium text-slate-400">#{u.id}</span>
                                </div>
                                <div className="text-slate-300">{u.email}</div>
                                {u.phone ? <div className="text-xs text-slate-400">{u.phone}</div> : null}
                              </div>
                            </div>
                          </td>

                          <td className="hidden px-6 py-4 md:table-cell">
                            <Badge variant={u.is_admin ? 'primary' : 'gray'}>{u.is_admin ? 'Admin' : 'User'}</Badge>
                          </td>

                          <td className="hidden px-6 py-4 lg:table-cell">
                            <Badge variant={badgeForStatus(u.status)}>{u.status || 'active'}</Badge>
                          </td>

                          <td className="hidden px-6 py-4 lg:table-cell">
                            <Badge variant={u.is_verified ? 'success' : 'warning'}>
                              {u.is_verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </td>

                          <td className="hidden px-6 py-4 xl:table-cell text-slate-300">{formatDate(u.created_at)}</td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => openEditUser(u)}>
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => requestDeleteUser(u)}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-950/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-300">
                    Page <span className="font-semibold text-white">{pagination.current_page}</span> of{' '}
                    <span className="font-semibold text-white">{pagination.last_page}</span> ·{' '}
                    <span className="font-semibold text-white">{pagination.total}</span> users
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page <= 1 || loadingUsers}
                      onClick={() => loadUsers(Math.max(1, pagination.current_page - 1))}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page >= pagination.last_page || loadingUsers}
                      onClick={() => loadUsers(Math.min(pagination.last_page, pagination.current_page + 1))}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal isOpen={userModalOpen} onClose={closeUserModal} title={userModalMode === 'create' ? 'Add User' : 'Edit User'} size="lg">
        <form onSubmit={submitUser} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Name</label>
              <InputField
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={firstError(formErrors, 'name')}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
              <InputField
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                error={firstError(formErrors, 'email')}
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Phone (optional)</label>
              <InputField
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                error={firstError(formErrors, 'phone')}
                placeholder="+20..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {firstError(formErrors, 'status') ? <p className="mt-2 text-sm text-red-500">{firstError(formErrors, 'status')}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Role</label>
              <select
                value={form.is_admin ? 'admin' : 'user'}
                onChange={(e) => setForm((p) => ({ ...p, is_admin: e.target.value === 'admin' }))}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {firstError(formErrors, 'is_admin') ? <p className="mt-2 text-sm text-red-500">{firstError(formErrors, 'is_admin')}</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <div>
              <h3 className="text-base font-bold text-gray-800">Password</h3>
              <p className="text-sm text-gray-600">
                {userModalMode === 'create' ? 'Required for new users.' : 'Leave blank to keep the current password.'}
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <InputField
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  error={firstError(formErrors, 'password')}
                  placeholder="New password"
                />
              </div>
              <div>
                <InputField
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                  error={firstError(formErrors, 'password_confirmation')}
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" type="button" onClick={closeUserModal} disabled={savingUser}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={savingUser}
              disabled={userModalMode === 'create' && (!form.password || !form.password_confirmation)}
            >
              {userModalMode === 'create' ? 'Create user' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete user"
        message={
          deletingUser
            ? `This will permanently delete ${deletingUser.email}. This action cannot be undone.`
            : 'This will permanently delete the selected user.'
        }
        onCancel={() => (deleting ? null : setConfirmDeleteOpen(false))}
        onConfirm={confirmDeleteUser}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        danger
      />
    </div>
  );
}
