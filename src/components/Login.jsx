import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";   // ✅ named import

const API_URL = process.env.REACT_APP_API_URL;

function Login({ setToken, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); // clear previous error

    try {
      // FastAPI expects form-data for /auth/token
      const res = await axios.post(
        `${API_URL}/auth/token`,
        new URLSearchParams({ username, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const token = res.data.access_token;
      localStorage.setItem("token", token);

      // Decode JWT to extract role
      const decoded = jwtDecode(token);
      const role = decoded?.role;

      // Update App state
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
      console.error("❌ Login error:", err);

      // ✅ Improved error handling: show backend message if available
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.msg ||
        "❌ Invalid username or password";
      setError(msg);
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        Don’t have an account? <Link to="/signup">Sign up here</Link>
      </p>
    </div>
  );
}

export default Login;
