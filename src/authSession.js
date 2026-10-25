import { request } from "./contractClient";

let refreshing;
export function sessionId(token) {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sid; }
  catch { return null; }
}
export function rememberSession(result) {
  localStorage.setItem("token", result.access_token);
  if (result.refresh_token) {
    sessionStorage.setItem("school-refresh", result.refresh_token);
    sessionStorage.setItem("school-session-id", sessionId(result.access_token));
  }
  window.dispatchEvent(new Event("school-session"));
  return result;
}
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  sessionStorage.removeItem("school-refresh");
  sessionStorage.removeItem("school-session-id");
  window.dispatchEvent(new Event("school-session"));
}
export async function renewSession(token) {
  const refresh = sessionStorage.getItem("school-refresh");
  if (!refresh || !sessionId(token) || sessionStorage.getItem("school-session-id") !== sessionId(token)) {
    throw new Error("Please sign in again.");
  }
  if (!refreshing) {
    refreshing = request("refresh_session", { body: { refresh_token: refresh } })
      .then(rememberSession).finally(() => { refreshing = null; });
  }
  return refreshing;
}
export async function endSession() {
  if (refreshing) { try { await refreshing; } catch { /* Still revoke the known session. */ } }
  const refresh = sessionStorage.getItem("school-refresh");
  const token = localStorage.getItem("token");
  // Keep credentials on a network failure so the user can retry revocation.
  if (refresh) await request("logout_refresh", { body: { refresh_token: refresh } });
  else if (token) await request("logout", { token });
  clearSession();
}
