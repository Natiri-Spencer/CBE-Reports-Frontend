import { rememberSession, endSession } from "./authSession";
import { request, mutate } from "./contractClient";
import { API_URL } from "./config";
export const BASE_URL = API_URL;

export const signup = (username, password, role = "teacher") => request("signup", { body: { username, password, role } });
export const login = (username, password) => request("login", { body: { username, password } }).then(rememberSession);
export const logout = endSession;
export const getAcademicCalendar = (token) => request("get_academic_calendar", { token });
export const getAdminDashboard = (token) => request("get_admin_dashboard", { token });
export const getLearners = (token, query = {}) => request("list_learners", { token, query });
export const createLearner = (record, token) => mutate("create_learner", record, token);
export const getMarks = (token, academic_year, term, class_name, offset = 0, limit = 50) =>
  request("list_marks", { token, query: { academic_year, term, class_name, offset, limit } });
export const submitMarks = (students, token) => mutate("submit_marks", { students }, token);
export const getFees = (token, academic_year, term) => request("list_fees", { token, query: { academic_year, term } });
export const saveFee = (record, token) => mutate("save_fee", record, token);
export const recordFeePayment = (fee_id, payment, token) => mutate("record_payment", payment, token, { fee_id });
export const getFeePayments = (fee_id, token, offset = 0, limit = 50) =>
  request("list_payments", { token, path: { fee_id }, query: { offset, limit } });
export const getReports = (token, academic_year, term, offset = 0, limit = 50) =>
  request("get_dashboard_report", { token, query: { academic_year, term, offset, limit } });

async function download(operation, filename, options) {
  const blob = await request(operation, { ...options, download: true });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const downloadReport = (format, token, academic_year, term) =>
  download("get_dashboard_report", `dashboard.${format}`, { token, query: { academic_year, term, export: format } });
export const downloadMarks = (format, token, academic_year, term, class_name) =>
  download(format === "csv" ? "download_marks_csv" : "download_marks_pdf", `marks.${format}`, { token, query: { academic_year, term, class_name } });
export const downloadFeeStatement = (fee_id, name, token) =>
  download("download_fee_statement", `${name.replace(/[^a-z0-9_-]+/gi, "_")}-fees.pdf`, { token, path: { fee_id } });
export const downloadLearnerReport = (learner_id, name, token, academic_year, term, class_name) =>
  download("download_learner_report", `${name.replace(/[^a-z0-9_-]+/gi, "_")}-report.pdf`, { token, path: { learner_id }, query: { academic_year, term, class_name } });

export const listAccounts = (token, offset = 0) => request("list_accounts", { token, query: { offset, limit: 50 } });
export const setAccountStatus = (token, user_id, is_active) => request("set_account_status", { token, path: { user_id }, body: { is_active } });
export const getAuthenticationMonitoring = (token) => request("authentication_monitoring", { token });
