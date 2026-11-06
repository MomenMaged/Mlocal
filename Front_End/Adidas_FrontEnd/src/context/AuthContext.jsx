
import { createContext, useCallback, useEffect, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext(null);

function getTokenExpiration(token) {
  try {
    const encodedPayload = token.split(".")[1];

    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(
      atob(normalizedPayload)
    );

    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  function login({ token, id, name, email, role }) {
    const userData = { id, name, email, role };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const handleTokenExpired = useCallback(() => {
    window.alert("Your session has expired. Please log in again.");
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener("auth:token-expired", handleTokenExpired);

    return () => {
      window.removeEventListener("auth:token-expired", handleTokenExpired);
    };
  }, [handleTokenExpired]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const expiration = getTokenExpiration(token);

    if (!expiration) {
      return undefined;
    }

    const delay = expiration - Date.now();

    if (delay <= 0) {
      handleTokenExpired();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      handleTokenExpired();
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [user, handleTokenExpired]);

  const logout = useCallback(async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await api.post(
          "/api/user/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      // Clear local session even if the API request fails.
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
