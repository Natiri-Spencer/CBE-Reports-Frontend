import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ role, onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    if (onLogout) onLogout(); // reset app state
    navigate("/login");
  }

  return (
    <nav
      style={{
        background: "#333",
        color: "#fff",
        padding: "10px",
        display: "flex",
        justifyContent: "space-between"
      }}
    >
      <div>
        <Link to="/" style={{ color: "#fff", marginRight: "15px" }}>Home</Link>
        <Link to="/marks" style={{ color: "#fff", marginRight: "15px" }}>Marks Entry</Link>
        <Link to="/about" style={{ color: "#fff", marginRight: "15px" }}>About</Link>

        {/* Show dashboards based on role */}
        {role === "teacher" && (
          <Link to="/teacher" style={{ color: "#fff", marginRight: "15px" }}>Teacher Dashboard</Link>
        )}
        {role === "admin" && (
          <Link to="/admin" style={{ color: "#fff", marginRight: "15px" }}>Admin Dashboard</Link>
        )}

        {/* Show login/signup if not logged in */}
        {!role && (
          <>
            <Link to="/login" style={{ color: "#fff", marginRight: "15px" }}>Login</Link>
            <Link to="/signup" style={{ color: "#fff", marginRight: "15px" }}>Sign Up</Link>
          </>
        )}
      </div>

      {/* Logout button if logged in */}
      {role && (
        <button
          onClick={handleLogout}
          style={{
            background: "red",
            color: "#fff",
            border: "none",
            padding: "5px 10px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}
