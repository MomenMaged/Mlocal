import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/api/user/forgot-password", {
        email: email.trim(),
      });

      setSuccess(response.data.message);
      setEmail("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
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
          <h1 className="text-center text-3xl font-bold">Forgot password?</h1>

          <p className="mt-2 text-center text-sm text-ink-soft">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5"
            >
              {loading ? "Sending..." : "Send reset link"}
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
