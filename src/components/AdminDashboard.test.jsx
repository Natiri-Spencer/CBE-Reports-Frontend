import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import * as api from "../api";

vi.mock("../api", () => ({
  getReports: vi.fn(), downloadReport: vi.fn(), getFees: vi.fn(), getAcademicCalendar: vi.fn(),
  saveFee: vi.fn(), downloadFeeStatement: vi.fn(), downloadLearnerReport: vi.fn(),
  recordFeePayment: vi.fn(), getFeePayments: vi.fn(),
  getLearners: vi.fn(), createLearner: vi.fn(),
}));

const fee = {
  id: 1, learner_id: "11111111-1111-4111-8111-111111111111", learner_name: "Test Learner", grade: "7", academic_year: 2026, term: 3,
  total_required: 1000, total_paid: 0, total_balance: 1000,
  pta_required: 0, remedials_required: 0, welfare_required: 0, lunch_required: 0, school_required: 1000,
};

beforeEach(() => {
  vi.resetAllMocks();
  api.getAcademicCalendar.mockResolvedValue({ academic_year: 2026, current_term: 3, terms: [] });
  api.getFees.mockResolvedValue([fee]);
  api.getReports.mockResolvedValue({ grades: {}, grade_summaries: {}, school_summary: {} });
  api.getFeePayments.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50 });
  api.getLearners.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50 });
});

test("records only one payment while a request is pending", async () => {
  let finish;
  api.recordFeePayment.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<AdminDashboard token="test-token" role="admin" />);
  const button = await screen.findByRole("button", { name: "Record payment" });
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "250" } });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.recordFeePayment).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: /recording payment/i })).toBeDisabled();
  expect(screen.getByLabelText("Payment amount")).toBeDisabled();
  await act(async () => finish({ id: 1 }));
  await waitFor(() => expect(screen.getByText("Payment recorded.")).toBeInTheDocument());
  expect(screen.getByLabelText("Payment amount")).toHaveValue(null);
  expect(api.getFeePayments).toHaveBeenCalledWith(1, "test-token");
});

test("failed payments preserve the entered values for retry", async () => {
  api.recordFeePayment.mockRejectedValueOnce(new Error("Payment unavailable"));
  render(<AdminDashboard token="test-token" role="admin" />);
  await screen.findByRole("button", { name: "Record payment" });
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent("Payment unavailable");
  expect(screen.getByLabelText("Payment amount")).toHaveValue(250);
  expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled();
});

test("report download failures are visible to the administrator", async () => {
  api.downloadReport.mockRejectedValueOnce(new Error("Download unavailable"));
  render(<AdminDashboard token="test-token" role="admin" />);
  fireEvent.click(await screen.findByRole("button", { name: "Download CSV" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Download unavailable");
});

test("report pagination requests the next page without changing the period", async () => {
  api.getReports.mockResolvedValue({ grades: {}, grade_summaries: {}, school_summary: {}, total: 75 });
  render(<AdminDashboard token="test-token" role="admin" />);
  fireEvent.click(await screen.findByRole("button", { name: "Next reports" }));
  await waitFor(() => expect(api.getReports).toHaveBeenLastCalledWith("test-token", 2026, 3, 50));
});

test("payment history supports multiple pages", async () => {
  api.getFeePayments.mockResolvedValueOnce({ items: [], total: 60, offset: 0, limit: 50 })
    .mockResolvedValueOnce({ items: [], total: 60, offset: 50, limit: 50 });
  render(<AdminDashboard token="test-token" role="admin" />);
  const summary = await screen.findByText("Payment history");
  const details = summary.closest("details");
  details.open = true;
  fireEvent(details, new Event("toggle"));
  fireEvent.click(await screen.findByRole("button", { name: "Next payments" }));
  await waitFor(() => expect(api.getFeePayments).toHaveBeenLastCalledWith(1, "test-token", 50));
});
