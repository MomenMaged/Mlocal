import useTheme from "../hooks/useTheme.js";

// Sun/moon button. Both icons are always rendered; CSS (.theme-toggle in index.css)
// rotates and fades between them, which is smoother than swapping elements.
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      data-light={isLight}
      className={`theme-toggle ${className}`}
    >
      {/* Sun: shown in light mode */}
      <svg
        viewBox="0 0 24 24"
        className="theme-icon theme-icon-sun"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>

      {/* Moon: shown in dark mode */}
      <svg
        viewBox="0 0 24 24"
        className="theme-icon theme-icon-moon"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
      </svg>
    </button>
  );
}
