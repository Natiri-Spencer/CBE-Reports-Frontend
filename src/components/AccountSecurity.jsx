import React, { useEffect, useState } from "react";
import { listAccounts, setAccountStatus, getAuthenticationMonitoring } from "../api";
export default function AccountSecurity({ token }) {
  const [accounts, setAccounts] = useState([]);
  const [monitoring, setMonitoring] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [users, counts] = await Promise.all([listAccounts(token, offset), getAuthenticationMonitoring(token)]);
    setAccounts(users); setMonitoring(counts);
  }
  useEffect(() => { let active = true;
    Promise.all([listAccounts(token, offset), getAuthenticationMonitoring(token)])
      .then(([users, counts]) => { if (active) { setAccounts(users); setMonitoring(counts); } })
      .catch(() => { if (active) setError("Could not load account security."); });
    return () => { active = false; };
  }, [token, offset]);
  async function change(user) {
    setBusy(true); setError("");
    try { await setAccountStatus(token, user.id, !user.is_active); await load(); }
    catch (err) { setError(err.message || "Account update failed."); }
    finally { setBusy(false); }
  }
  return <section id="account-security" aria-label="Account security">
    <h2>Account access</h2><p>Approve teacher requests or disable accounts. Disabling an account immediately ends all its sessions.</p>
    {monitoring && <p>Last 24 hours: {monitoring.failed} failed logins, {monitoring.succeeded} successful logins, {monitoring.pending} pending attempts.</p>}
    {error && <p role="alert">{error}</p>}
    <table><thead><tr><th>Account</th><th>Role</th><th>Access</th><th>Action</th></tr></thead>
      <tbody>{accounts.map(user => <tr key={user.id}><td>{user.username}</td><td>{user.role}</td><td>{user.is_active ? "Active" : "Disabled or pending"}</td>
        <td><button disabled={busy} onClick={() => change(user)}>{user.is_active ? "Disable" : "Approve access"}</button></td></tr>)}</tbody></table>
    <button disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous accounts</button>
    <button disabled={accounts.length < 50 || busy} onClick={() => setOffset(offset + 50)}>Next accounts</button>
  </section>;
}
