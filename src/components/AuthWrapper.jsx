import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function AuthWrapper({ children, setRole, setToken }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded?.role;

        setToken(token);
        setRole(role);

        // Redirect based on role
        if (role === "teacher") {
          navigate("/teacher");
        } else if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("❌ Invalid token:", err);
        localStorage.removeItem("token");
        setToken(null);
        setRole(null);
        navigate("/login");
      }
    }
  }, [setRole, setToken, navigate]);

  return children;
}

export default AuthWrapper;
