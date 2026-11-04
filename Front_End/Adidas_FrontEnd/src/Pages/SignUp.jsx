import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function SignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/user", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      navigate("/login", {
        state: { message: "Account created successfully. Please log in." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      id: "name",
      label: "Full name",
      type: "text",
      autoComplete: "name",
      placeholder: "Enter your name",
    },
    {
      id: "email",
      label: "Email address",
      type: "email",
      autoComplete: "email",
      placeholder: "you@example.com",
    },
    {
      id: "password",
      label: "Password",
      type: "password",
      autoComplete: "new-password",
      placeholder: "At least 8 characters",
    },
    {
      id: "confirmPassword",
      label: "Confirm password",
      type: "password",
      autoComplete: "new-password",
      placeholder: "Enter your password again",
    },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">MLocal</span>.
          </Link>
        </div>

        <div className="glass-strong rounded-glass-lg p-7 sm:p-9">
          <h1 className="text-center text-3xl font-bold">Create an account</h1>

          <p className="mt-2 text-center text-sm text-ink-soft">
            Join us and find your next favourite.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {fields.map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={field.id}
                  className="mb-2 block text-sm font-semibold"
                >
                  {field.label}
                </label>

                <input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={form[field.id]}
                  onChange={handleChange}
                  required
                  minLength={field.type === "password" ? 8 : undefined}
                  className="field"
                  placeholder={field.placeholder}
                />
              </div>
            ))}

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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-grape hover:underline">
              Log in
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
