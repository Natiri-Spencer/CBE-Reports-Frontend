import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../api";
export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      const result = await signup(username, password);
      setPassword("");
      setMessage(result.msg);
    } catch (error) { setMessage(error.message || "Could not request an account."); }
  }
  return <main className="auth-page"><h2>Request teacher access</h2>
    <form onSubmit={submit}>
      <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required maxLength={100} /></label>
      <label>Password<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} maxLength={1024} /></label>
      <p>Use at least 12 characters. An administrator must approve your account before you can sign in.</p>
      <button type="submit">Request access</button>
    </form>{message && <p role="status">{message}</p>}<p><Link to="/login">Return to login</Link></p>
  </main>;
}
