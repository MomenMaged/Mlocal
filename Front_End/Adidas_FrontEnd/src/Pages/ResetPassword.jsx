import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/api/user/reset-password", {
        token,
        newPassword,
      });

      setSuccess(response.data.message);

      setNewPassword("");
      setConfirmPassword("");

      // Redirect to login after a short delay.
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">MLocal</span>.
          </Link>
        </div>

        <div className="glass-strong rounded-glass-lg p-7 sm:p-9">
          <h1 className="text-center text-3xl font-bold">Reset password</h1>

          <p className="mt-2 text-center text-sm text-ink-soft">
            Choose a new password for your account.
          </p>

          {!token && (
            <div className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              Reset token is missing. Please request a new password reset link.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint">
              {success} Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold"
              >
                New password
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
                required
                disabled={!token || loading || Boolean(success)}
                className="field disabled:bg-white/40 disabled:text-ink-soft"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={8}
                required
                disabled={!token || loading || Boolean(success)}
                className="field disabled:bg-white/40 disabled:text-ink-soft"
              />
            </div>

            <button
              type="submit"
              disabled={!token || loading || Boolean(success)}
              className="btn-primary w-full py-3.5"
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link
              to="/login"
              className="font-semibold text-ink transition hover:text-grape hover:underline"
            >
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
