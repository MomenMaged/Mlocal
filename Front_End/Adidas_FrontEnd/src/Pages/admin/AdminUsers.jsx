import { useEffect, useState } from "react";
import api from "../../services/api.js";
import { useDebounce } from "../../hooks/useDeBounce.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [selectedRole, setSelectedRole] = useState("all");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const limit = 10;

  // Fetch users
  useEffect(() => {
    const controller = new AbortController();

    async function fetchUsers() {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit,
        };

        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        if (selectedRole !== "all") {
          params.role = selectedRole;
        }

        const response = await api.get("/api/user", {
          params,
          signal: controller.signal,
        });

        setUsers(response.data.users || []);
        setPagination(response.data.pagination || {});
      } catch (error) {
        if (
          error.name !== "CanceledError" &&
          error.name !== "AbortError"
        ) {
          console.error("Fetch users error:", error);
          setError("Failed to load users. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => controller.abort();
  }, [page, debouncedSearch, selectedRole, refresh]);

  // Change user role
  async function handleRoleChange(user) {
    const newRole = user.role === "admin" ? "user" : "admin";

    const confirmed = window.confirm(
      `Are you sure you want to change ${user.name}'s role to ${newRole}?`
    );

    if (!confirmed) return;

    try {
      await api.patch(`/api/user/${user._id}/role`, {
        role: newRole,
      });

      setRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Update role error:", error);
      alert(error.response?.data?.message || "Failed to update user role.");
    }
  }

  // Delete user
  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/user/${user._id}`);

      // If the last user on this page is deleted, go to the previous page.
      if (users.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        setRefresh((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert(error.response?.data?.message || "Failed to delete user.");
    }
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleRoleFilterChange(value) {
    setSelectedRole(value);
    setPage(1);
  }

  function getRoleClass(role) {
    return role === "admin" ? "chip-shipped" : "chip-unpaid";
  }

  const summary = [
    { label: "Total users", value: pagination.totalUsers ?? 0 },
    { label: "Current page", value: page },
    { label: "Total pages", value: pagination.totalPages ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
          People
        </p>

        <h1 className="mt-2 text-3xl font-bold">Users</h1>

        <p className="mt-2 text-sm text-ink-soft">
          Manage registered users and their roles.
        </p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="glass p-5">
            <p className="text-sm text-ink-soft">{item.label}</p>

            <p className="mt-2 font-display text-2xl font-bold">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="glass flex flex-col gap-3 p-4 md:flex-row">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="field min-w-0 flex-1 border-0 bg-white/40 focus:bg-white/70"
        />

        <select
          value={selectedRole}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
          className="field md:w-48"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{error}</p>

          <button
            onClick={() => setRefresh((prev) => prev + 1)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/40 text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/50">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-ink-soft">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-ink-soft">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="transition hover:bg-white/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-grape/20 to-aqua/20 font-semibold">
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </div>

                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-ink-soft">{user.email}</td>

                    <td className="px-6 py-4">
                      <span className={`chip ${getRoleClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-ink-soft">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => handleRoleChange(user)}
                          className="whitespace-nowrap font-semibold text-grape transition hover:text-sky"
                        >
                          Make {user.role === "admin" ? "User" : "Admin"}
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          className="font-semibold text-danger transition hover:text-danger/70"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {loading && users.length > 0 && (
          <p className="px-6 py-2 text-xs text-ink-soft">Updating users...</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-ink-soft">
          Page {page} of {pagination.totalPages ?? 0}
          {" · "}
          {pagination.totalUsers ?? 0} users
        </p>

        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => prev - 1)}
            className="btn-glass px-4 py-2 text-[11px]"
          >
            Previous
          </button>

          <button
            disabled={
              loading ||
              !pagination.totalPages ||
              page >= pagination.totalPages
            }
            onClick={() => setPage((prev) => prev + 1)}
            className="btn-glass px-4 py-2 text-[11px]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
