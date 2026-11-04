import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function SecuritySettings() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const togglePassword = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.patch("/api/user/change-password", {
        currentPassword,
        newPassword,
      });

      setSuccess(response.data.message || "Password changed successfully.");

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordFields = [
    {
      name: "currentPassword",
      label: "Current password",
      key: "current",
      placeholder: "Enter your current password",
    },
    {
      name: "newPassword",
      label: "New password",
      key: "new",
      placeholder: "Enter your new password",
    },
    {
      name: "confirmPassword",
      label: "Confirm new password",
      key: "confirm",
      placeholder: "Confirm your new password",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        to="/my-account"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-grape"
      >
        ← Back to profile
      </Link>

      <div className="glass-strong p-6 sm:p-9">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Security settings</h1>

          <p className="mt-2 text-sm text-ink-soft">
            Change your account password to keep your account secure.
          </p>
        </div>

        {success && (
          <div className="mb-6 rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {passwordFields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-semibold"
              >
                {field.label}
              </label>

              <div className="relative">
                <input
                  id={field.name}
                  name={field.name}
                  type={showPasswords[field.key] ? "text" : "password"}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  autoComplete="new-password"
                  className="field pr-20"
                />

                <button
                  type="button"
                  onClick={() => togglePassword(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm font-semibold text-ink-soft transition hover:bg-white/70 hover:text-ink"
                >
                  {showPasswords[field.key] ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs text-ink-soft">
            Your new password must contain at least 8 characters.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? "Changing password..." : "Change password"}
          </button>
        </form>
      </div>
    </main>
  );
}
