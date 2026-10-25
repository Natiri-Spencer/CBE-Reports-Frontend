import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";


function Signup({ setToken, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); // clear previous error

    try {
      // 1. Create user in FastAPI
      await axios.post(`${API_URL}/auth/signup`, {
        username,
        password,
        role: "teacher",
      });

      // 2. Immediately log them in
      const res = await axios.post(
        `${API_URL}/auth/token`,
        new URLSearchParams({ username, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const token = res.data.access_token;
      localStorage.setItem("token", token);

      // 3. Decode JWT to extract role safely
      let userRole = null;
      try {
        const decoded = jwtDecode(token);
        userRole = decoded?.role;
      } catch (decodeErr) {
        console.error("❌ Token decode error:", decodeErr);
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      // 4. Update App state
      setToken(token);
      setRole(userRole);

      // 5. Redirect based on role
      if (userRole === "teacher") {
        navigate("/teacher");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("❌ Signup error:", err);

      // ✅ Improved error handling: show backend message if available
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.msg ||
        "❌ Signup failed. Try again.";
      setError(msg);
    }
  }

  return (
    <main className="auth-page">
      <h2>Signup</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <p>New accounts are created with teacher access. Contact an administrator for admin access.</p>
        <button type="submit">Signup</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </main>
  );
}

export default Signup;
