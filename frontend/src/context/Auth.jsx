import { createContext, useContext, useEffect, useState } from "react";
import { api, errorMessage } from "../api";
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  async function loadUser() {
    setLoading(true);
    setInitialError("");
    try {
      setUser((await api.get("/auth/me")).data.user);
    } catch (error) {
      if (error.response?.status !== 401) setInitialError(errorMessage(error));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadUser();
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function login(email, password) {
    const r = await api.post("/auth/login", { email, password });
    setUser(r.data.user);
    setInitialError("");
    return r.data.user;
  }
  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        initialError,
        loadUser,
        login,
        logout,
        clearUser: () => setUser(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
