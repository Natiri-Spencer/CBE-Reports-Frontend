import { logout } from "./api";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import TeacherDashboard from "./components/TeacherDashboard";
import MarksForm from "./components/MarksForm";
import AdminDashboard from "./components/AdminDashboard";
import AdminHome from "./components/AdminHome";
import AuthWrapper from "./components/AuthWrapper";
import About from "./components/About";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import "./mobile.css";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (role) localStorage.setItem("role", role);
    else localStorage.removeItem("role");
  }, [role]);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
  };

  return (
    <Router>
      <Navbar role={role} onLogout={handleLogout} />
      <AuthWrapper token={token} setRole={setRole} setToken={setToken}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setToken={setToken} setRole={setRole} />} />
          <Route path="/signup" element={<Signup setToken={setToken} setRole={setRole} />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/teacher/marks"
            element={
              token && role === "teacher" ? (
                <ErrorBoundary><MarksForm token={token} /></ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/marks" element={<Navigate to="/teacher/marks" replace />} />

          {/* Protected routes */}
          <Route
            path="/teacher"
            element={
              token && role === "teacher" ? (
                <ErrorBoundary>
                  <TeacherDashboard token={token} onLogout={handleLogout} />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              token && role === "admin" ? (
                <ErrorBoundary>
                  <AdminHome token={token} />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/finance"
            element={
              token && role === "admin" ? (
                <ErrorBoundary>
                  <AdminDashboard token={token} role={role} onLogout={handleLogout} />
                </ErrorBoundary>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthWrapper>
    </Router>
  );
}

export default App;
