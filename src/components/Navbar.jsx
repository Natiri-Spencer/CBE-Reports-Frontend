// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ role, onLogout }) {
  const navigate = useNavigate();

  const [logoutError, setLogoutError] = useState("");
  async function handleLogout() {
    try {
      await onLogout?.();
      navigate("/login");
    } catch {
      setLogoutError("Could not revoke the session. Check your connection and retry logout.");
    }
  }
  return (
    <nav className="app-nav"
      style={{
        background: "#333",
        color: "#fff",
        padding: "10px",
        display: "flex",
        justifyContent: "space-between"
      }}
    >
      <div>
        {role === "admin" ? (
          <>
            <Link to="/admin" style={{ color: "#fff", marginRight: "15px" }}>Home</Link>
            <Link to="/admin/finance#learner-records" style={{ color: "#fff", marginRight: "15px" }}>Students</Link>
            <Link to="/admin#academic-status" style={{ color: "#fff", marginRight: "15px" }}>Academics</Link>
            <Link to="/admin/finance#finance" style={{ color: "#fff", marginRight: "15px" }}>Finance</Link>
            <Link to="/about" style={{ color: "#fff", marginRight: "15px" }}>More</Link>
          </>
        ) : role === "teacher" ? (
          <>
            <Link to="/teacher" style={{ color: "#fff", marginRight: "15px" }}>Home</Link>
            <Link to="/teacher/marks" style={{ color: "#fff", marginRight: "15px" }}>Marks</Link>
            <Link to="/about" style={{ color: "#fff", marginRight: "15px" }}>More</Link>
          </>
        ) : (
          <>
            <Link to="/" style={{ color: "#fff", marginRight: "15px" }}>Home</Link>
            <Link to="/about" style={{ color: "#fff", marginRight: "15px" }}>About</Link>
            <Link to="/login" style={{ color: "#fff", marginRight: "15px" }}>Login</Link>
            <Link to="/signup" style={{ color: "#fff", marginRight: "15px" }}>Sign Up</Link>
          </>
        )}
      </div>

      {logoutError && <p role="alert">{logoutError}</p>}
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
