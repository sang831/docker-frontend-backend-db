import { useCallback, useEffect, useState } from "react";
import Home from "./components/home";
import Login from "./components/login";

import "./App.css";
import { api } from "./api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    api.get("/auth/session")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleLogin = useCallback(() => setIsAuthenticated(true), []);
  const handleLogout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // The browser will drop the HttpOnly session cookie when it expires.
    } finally {
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <div className="container">
      {isAuthenticated === null ? (
        <p className="mt-5" role="status">Checking your session…</p>
      ) : isAuthenticated ? (
        <Home onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
