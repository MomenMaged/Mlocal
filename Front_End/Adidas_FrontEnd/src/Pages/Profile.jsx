import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch the logged-in user's profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/user/profile");

      const user = response.data.user;

      setProfile(user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Enter edit mode
  const handleEdit = () => {
    setFormData({
      name: profile.name || "",
      email: profile.email || "",
    });

    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      name: profile.name || "",
      email: profile.email || "",
    });

    setError("");
    setIsEditing(false);
  };

  // Save profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/api/user/profile", {
        name: formData.name.trim(),
        email: formData.email.trim(),
      });

      const updatedUser = response.data.user;

      setProfile(updatedUser);
      setFormData({
        name: updatedUser.name,
        email: updatedUser.email,
      });

      setIsEditing(false);
      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading your profile...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <h2 className="text-2xl font-bold">Unable to load profile</h2>

          <p className="mt-3 text-sm text-danger">{error}</p>

          <button onClick={fetchProfile} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-ink-soft">
        <Link to="/" className="transition hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-ink">My account</span>
      </nav>

      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">My account</h1>

        <p className="mt-2 text-ink-soft">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="glass h-fit p-3">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
            Account menu
          </p>

          <nav className="space-y-1">
            <Link
              to="/my-account"
              className="flex rounded-2xl bg-gradient-to-r from-grape to-sky px-4 py-3 text-sm font-semibold text-white shadow-glow"
            >
              Profile information
            </Link>

            <Link
              to="/my-orders"
              className="flex rounded-2xl px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-white/60 hover:text-ink"
            >
              My orders
            </Link>

            <Link
              to="/my-account/security"
              className="flex rounded-2xl px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-white/60 hover:text-ink"
            >
              Security settings
            </Link>
          </nav>
        </aside>

        {/* Profile content */}
        <section className="glass-strong p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Personal information</h2>

              <p className="mt-1 text-sm text-ink-soft">
                View and update your account details.
              </p>
            </div>

            {!isEditing && (
              <button onClick={handleEdit} className="btn-primary px-5 py-2.5">
                Edit profile
              </button>
            )}
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Full name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Full name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing || saving}
                  required
                  className="field disabled:bg-white/40 disabled:text-ink-soft"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing || saving}
                  required
                  className="field disabled:bg-white/40 disabled:text-ink-soft"
                  placeholder="Enter your email"
                />
              </div>

              {/* Account role */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Account type
                </label>

                <input
                  type="text"
                  value={profile.role || "user"}
                  disabled
                  className="field capitalize disabled:bg-white/40 disabled:text-ink-soft"
                />
              </div>
            </div>

            {/* Action buttons */}
            {isEditing && (
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="btn-glass"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
