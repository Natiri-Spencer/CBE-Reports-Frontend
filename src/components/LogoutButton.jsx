import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

function LogoutButton({ onLogout }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Call backend logout endpoint
      await axios.post(`${API_URL}/auth/logout`);

      // Clear JWT from localStorage
      localStorage.removeItem("token");

      // Update parent state if provided
      if (onLogout) onLogout();

      // Redirect to login
      navigate("/login");
    } catch (err) {
      console.error("❌ Logout error:", err);
      // Even if backend fails, clear token client-side
      localStorage.removeItem("token");
      if (onLogout) onLogout();
      navigate("/login");
    }
  }

  return (
    <button onClick={handleLogout} style={{ marginTop: "20px" }}>
      Logout
    </button>
  );
}

export default LogoutButton;
