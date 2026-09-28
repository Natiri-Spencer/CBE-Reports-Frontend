const BASE_URL = "http://127.0.0.1:8000"; // FastAPI backend

// --- Signup ---
export async function signup(username, password, role) {
  try {
    const response = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Signup failed: ${err}`);
    }

    return await response.json();
  } catch (err) {
    console.error("❌ Signup error:", err.message);
    throw err;
  }
}

// --- Login ---
export async function login(username, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Login failed: ${err}`);
    }

    return await response.json(); // contains JWT token
  } catch (err) {
    console.error("❌ Login error:", err.message);
    throw err;
  }
}

// --- Logout ---
export async function logout() {
  try {
    const response = await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Logout failed: ${err}`);
    }

    return await response.json();
  } catch (err) {
    console.error("❌ Logout error:", err.message);
    throw err;
  }
}

// --- Reports ---
export async function getReports(token) {
  try {
    const response = await fetch(`${BASE_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch reports: ${err}`);
    }

    return await response.json();
  } catch (err) {
    console.error("❌ Reports error:", err.message);
    throw err;
  }
}
