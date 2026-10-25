import React, { useState } from "react";

import { logout } from "../api";
export default function LogoutButton({ onLogout }) {

  const [error, setError] = useState("");
  async function handleLogout() {
    try { if (onLogout) await onLogout(); else { await logout(); window.location.assign("/login"); } }
    catch { setError("Could not revoke the session. Check your connection and retry logout."); }
  }
  return <><button onClick={handleLogout}>Logout</button>{error && <p role="alert">{error}</p>}</>;
}
