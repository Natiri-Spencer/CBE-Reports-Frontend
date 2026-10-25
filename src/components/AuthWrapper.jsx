import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { renewSession, clearSession } from "../authSession";

export default function AuthWrapper({ children, token, setRole, setToken }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    const changed = () => setToken(localStorage.getItem("token"));
    window.addEventListener("school-session", changed);
    return () => window.removeEventListener("school-session", changed);
  }, [setToken]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const expire = () => {
      if (cancelled) return;
      clearSession();
      setToken(null);
      setRole(null);
      navigate("/login", { replace: true });
    };
    const renew = () => renewSession(token).then((data) => {
      if (!cancelled) setToken(data.access_token);
    }).catch(expire);
    let timer;
    try {
      const decoded = jwtDecode(token);
      if (!["teacher", "admin"].includes(decoded.role) || !Number.isFinite(decoded.exp)) throw new Error("Invalid session");
      if (decoded.exp * 1000 <= Date.now()) {
        if (sessionStorage.getItem("school-refresh")) renew(); else expire();
      }
      else {
        setRole(decoded.role);
        if (["/", "/login", "/signup"].includes(pathname)) navigate(decoded.role === "teacher" ? "/teacher" : "/admin", { replace: true });
        timer = setTimeout(renew, Math.max(1000, decoded.exp * 1000 - Date.now() - 60000));
      }
    } catch { expire(); }
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, pathname, setRole, setToken, navigate]);
  return children;
}
