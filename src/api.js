import { API_URL } from "./config";

export const BASE_URL = API_URL;

// Helper function to handle fetch + error parsing
async function handleResponse(response, action) {
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${action} failed: ${err}`);
  }
  return await response.json();
}

// --- Signup ---
export async function signup(username, password, role) {
  try {
    const response = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    return await handleResponse(response, "Signup");
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
    return await handleResponse(response, "Login");
  } catch (err) {
    console.error("❌ Login error:", err.message);
    throw err;
  }
}

// --- Logout ---
export async function logout() {
  try {
    const response = await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
    return await handleResponse(response, "Logout");
  } catch (err) {
    console.error("❌ Logout error:", err.message);
    throw err;
  }
}

// --- Download Report ---
export async function downloadReport(format, token, academicYear, term) {
  try {
    const params = new URLSearchParams({ export: format });
    if (academicYear !== undefined && academicYear !== null) params.set("academic_year", academicYear);
    if (term !== undefined && term !== null) params.set("term", term);
    const response = await fetch(`${BASE_URL}/reports/dashboard?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Download failed: ${err}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dashboard.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("❌ Download error:", err.message);
    throw err;
  }
}


// --- Reports ---
export async function getReports(token, academicYear, term) {
  try {
    const params = new URLSearchParams();
    if (academicYear !== undefined && academicYear !== null) params.set("academic_year", academicYear);
    if (term !== undefined && term !== null) params.set("term", term);
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/reports/dashboard${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(response, "Fetch reports");
  } catch (err) {
    console.error("❌ Reports error:", err.message);
    throw err;
  }
}

export async function getFees(token, academicYear, term) {
  const params = new URLSearchParams();
  if (academicYear !== undefined && academicYear !== null) params.set("academic_year", academicYear);
  if (term !== undefined && term !== null) params.set("term", term);
  const query = params.toString();
  const response = await fetch(`${BASE_URL}/fees${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(response, "Fetch fees");
}

export async function getAcademicCalendar(token) {
  const response = await fetch(`${BASE_URL}/fees/calendar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(response, "Fetch academic calendar");
}

export async function getAdminDashboard(token) {
  const response = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(response, "Fetch admin dashboard");
}

export async function recordFeePayment(feeId, payment, token) {
  const response = await fetch(`${BASE_URL}/fees/records/${feeId}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payment),
  });
  return await handleResponse(response, "Record fee payment");
}

export async function getFeePayments(feeId, token) {
  const response = await fetch(`${BASE_URL}/fees/records/${feeId}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(response, "Fetch payment history");
}

export async function submitMarks(students, token) {
  const response = await fetch(`${BASE_URL}/marks/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ students }),
  });
  return await handleResponse(response, "Save marks");
}

export async function getMarks(token) {
  const response = await fetch(`${BASE_URL}/marks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(response, "Fetch marks");
}

export async function saveFee(record, token) {
  const response = await fetch(`${BASE_URL}/fees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(record),
  });
  return await handleResponse(response, "Save fee record");
}

async function downloadFile(url, filename, token, action) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`${action} failed: ${await response.text()}`);
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function downloadFeeStatement(feeId, learnerName, token) {
  return downloadFile(
    `${BASE_URL}/fees/records/${feeId}/statement.pdf`,
    `${learnerName.replace(/[^a-z0-9_-]+/gi, "_")}-fee-statement.pdf`,
    token,
    "Download fee statement"
  );
}

export function downloadLearnerReport(learnerName, token, academicYear, term) {
  const learner = encodeURIComponent(learnerName);
  const params = new URLSearchParams();
  if (academicYear !== undefined && academicYear !== null) params.set("academic_year", academicYear);
  if (term !== undefined && term !== null) params.set("term", term);
  const query = params.toString();
  return downloadFile(
    `${BASE_URL}/reports/learner/${learner}/pdf${query ? `?${query}` : ""}`,
    `${learnerName.replace(/[^a-z0-9_-]+/gi, "_")}-report.pdf`,
    token,
    "Download learner report"
  );
}

// --- Download Marks Report ---
export async function downloadMarks(format, token) {
  try {
    const endpoint = format === "csv" ? "/marks/export" : "/marks/export/pdf";
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Download failed: ${err}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `marks_export.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("❌ Download error:", err.message);
    throw err;
  }
}
