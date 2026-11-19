import "./App.css";
import { useEffect, useState } from "react";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/register";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("silver_token")
  );

  const [currentPath, setCurrentPath] = useState(
    window.location.pathname
  );

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function handleLogin(newToken: string) {
    localStorage.setItem("silver_token", newToken);
    setToken(newToken);
    navigate("/");
  }

  function handleLogout() {
  localStorage.removeItem("silver_token");
  setToken(null);
  navigate("/login");
}


if (currentPath === "/reset-password") {
    return (
      <ResetPassword
        onBack={() => navigate("/login")}
      />
    );
  }

  
  if (currentPath === "/forgot-password") {
    return (
      <ForgotPassword
        onBack={() => navigate("/login")}
      />
    );
  }


  if (currentPath === "/register") {
    return (
      <Register
        onBack={() => navigate("/login")}
        onSuccess={() => navigate("/login")}
      />
    );
  }

   if (token) {
  return <Dashboard onLogout={handleLogout} />;
}

  return (
  <Login
    onLogin={handleLogin}
    onForgotPassword={() => navigate("/forgot-password")}
    onRegister={() => navigate("/register")}
  />
);

}

export default App;