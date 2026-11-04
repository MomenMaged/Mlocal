import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.jsx";
import api from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const successMessage = location.state?.message;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await api.post("/api/user/login", {
        email: email.trim(),
        password,
      });

      login(response.data);

      if (response.data.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to log in. Please try again."
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
          <h1 className="text-center text-3xl font-bold">Welcome back</h1>

          <p className="mt-2 text-center text-sm text-ink-soft">
            Log in to continue shopping.
          </p>

          {successMessage && (
            <p className="mt-5 rounded-2xl bg-mint/15 px-4 py-3 text-center text-sm font-medium text-mint">
              {successMessage}
            </p>
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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-ink-soft transition hover:text-grape hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-bold text-grape hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          <Link to="/" className="transition hover:text-ink">
            ← Back to store
          </Link>
        </p>
      </div>
    </main>
  );
}
