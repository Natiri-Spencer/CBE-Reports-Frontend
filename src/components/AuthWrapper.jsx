import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function AuthWrapper({ children, token, setRole, setToken }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded?.role;
        if (!["teacher", "admin"].includes(role) || !Number.isFinite(decoded.exp) || decoded.exp * 1000 <= Date.now()) {
          throw new Error("Session expired or invalid. Please log in again.");
        }

        setToken(token);
        setRole(role);

        // Redirect based on role
        if (["/", "/login", "/signup"].includes(pathname)) {
          navigate(role === "teacher" ? "/teacher" : "/admin", { replace: true });
        }
        const timer = setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setToken(null);
          setRole(null);
          navigate("/login", { replace: true });
        }, Math.min(decoded.exp * 1000 - Date.now(), 2147483647));
        return () => clearTimeout(timer);
      } catch (err) {
        console.error("❌ Invalid token:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setToken(null);
        setRole(null);
        navigate("/login");
      }
    }
  }, [token, pathname, setRole, setToken, navigate]);

  return children;
}

export default AuthWrapper;
