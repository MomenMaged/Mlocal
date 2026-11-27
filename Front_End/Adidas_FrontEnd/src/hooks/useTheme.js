import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

// The first theme is set by a small script in index.html, before React loads,
// so the page never flashes the wrong colours. This hook only reads and changes it.
const STORAGE_KEY = "theme";
const THEME_COLORS = { dark: "#0b0b0c", light: "#f8f7f4" };

function readTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setDocumentTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // Colours the browser UI (address bar on phones) to match the page
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
  // Tell every toggle on the page (navbar, mobile menu, admin) to update
  window.dispatchEvent(new Event("themechange"));
}

export default function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener("themechange", sync);

    // No saved choice yet? Follow the device's light/dark setting live.
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const followDevice = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setDocumentTheme(media.matches ? "light" : "dark");
      }
    };
    media.addEventListener("change", followDevice);

    return () => {
      window.removeEventListener("themechange", sync);
      media.removeEventListener("change", followDevice);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = readTheme() === "light" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next);

    // flushSync makes React update the toggle icon immediately, so the
    // cross-fade below captures the finished page (new colours + new icon).
    const apply = () => flushSync(() => setDocumentTheme(next));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduceMotion) {
      // View Transitions API: the browser cross-fades a snapshot of the old page into the new one
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  return { theme, toggleTheme };
}
