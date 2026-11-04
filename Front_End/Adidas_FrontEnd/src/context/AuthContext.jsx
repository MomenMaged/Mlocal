
import { createContext, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  console.log("AuthProvider user state:", user);

  function login({ token, id, name, email, role }) {
    const userData = { id, name, email, role };

    console.log("AuthContext login called:", userData);

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  async function logout() {
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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

