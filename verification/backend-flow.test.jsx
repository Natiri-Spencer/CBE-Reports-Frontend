import { webcrypto } from "node:crypto";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import MarksForm from "../src/components/MarksForm";
import AdminDashboard from "../src/components/AdminDashboard";
import { getFees, getFeePayments, getMarks, getLearners, login } from "../src/api";
import { request } from "../src/contractClient";

beforeAll(() => {
  if (import.meta.env.VITE_API_URL !== "http://127.0.0.1:8765") throw new Error("Integration tests require the synthetic server on port 8765");
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

test("the real marks form stores zero scores against the selected permanent identity and period", async () => {
  const admin = (await login("test_admin", "synthetic-test-password")).access_token;
  const teacher = (await login("test_teacher", "synthetic-test-password")).access_token;
  const [fee] = await getFees(admin);
  render(<MarksForm token={teacher} />);
  await screen.findByRole("option", { name: new RegExp(fee.learner_id.slice(-8)) });
  fireEvent.change(screen.getByLabelText(/^Learner$/), { target: { value: fee.learner_id } });
  fireEvent.change(screen.getByLabelText("Academic year"), { target: { value: "2026" } });
  fireEvent.change(screen.getByLabelText("Term"), { target: { value: "3" } });
  screen.getAllByRole("spinbutton").filter((input) => input.min === "0").forEach((input) => fireEvent.change(input, { target: { value: "0" } }));
  fireEvent.click(screen.getByRole("button", { name: "Submit Marks" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Marks saved successfully");
  const page = await getMarks(teacher, 2026, 3, "7");
  const mark = page.items.find((item) => item.learner_id === fee.learner_id);
  expect(mark).toMatchObject({ learner_id: fee.learner_id, class_name: "7", academic_year: 2026, term: 3, average: 0, status: "BE2" });
  expect(mark.creative_arts).toBe(0);
});

test("the real finance form records one synthetic payment and refreshes reports and history", async () => {
  const token = (await login("test_admin", "synthetic-test-password")).access_token;
  const [before] = await getFees(token);
  render(<AdminDashboard token={token} role="admin" />);
  await screen.findByRole("button", { name: "Record payment" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Next learners" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "125" } });
  fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
  fireEvent.click(screen.getByRole("button", { name: /recording payment/i }));
  await waitFor(() => expect(screen.getByText("Payment recorded.")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByLabelText("Payment amount")).toBeEnabled());
  const [after] = await getFees(token);
  expect(after.total_paid - before.total_paid).toBe(125);
  const history = await getFeePayments(after.id, token);
  expect(history.items.some((item) => item.amount === 125)).toBe(true);
  const report = await request("get_learner_report", { token, path: { learner_id: after.learner_id }, query: { academic_year: 2026, term: 3, class_name: "7" } });
  expect(report.fees.total_paid).toBe(after.total_paid);
  expect(report.marks.status).toBe("BE2");
  const admin = await request("get_admin_dashboard", { token });
  expect(admin.counts.students).toBeGreaterThan(50);
  expect(admin.recent_activity[0].created_at).toMatch(/Z$/);
  const download = await request("get_dashboard_report", { token, query: { academic_year: 2026, term: 3, export: "csv" }, download: true });
  expect(await download.text()).toContain(after.learner_id);
});

test("the finance form creates separate fee records for namesake learners", async () => {
  const token = (await login("test_admin", "synthetic-test-password")).access_token;
  const [existing] = await getFees(token);
  const namesakes = await getLearners(token, { search: "Same Name" });
  const other = namesakes.items.find((learner) => learner.id !== existing.learner_id);
  render(<AdminDashboard token={token} role="admin" />);
  await screen.findByRole("option", { name: new RegExp(other.id.slice(-8)) });
  fireEvent.change(screen.getByLabelText(/^Learner$/), { target: { value: other.id } });
  fireEvent.change(within(screen.getByRole("group", { name: "School", exact: true })).getByLabelText("Required"), { target: { value: "1250" } });
  fireEvent.click(screen.getByRole("button", { name: "Save fee record" }));
  await screen.findByText(/Saved fees for Same Name/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Save fee record" })).toBeEnabled());
  const fees = await getFees(token);
  expect(fees.find((fee) => fee.learner_id === other.id).school_required).toBe(1250);
  expect(fees.find((fee) => fee.id === existing.id).school_required).toBe(1000);
});

// Exercise approval and revocation through React against the real synthetic API.
test("a teacher request needs administrator approval and logout revokes the renewed session", async () => {
  const { default: Signup } = await import("../src/components/Signup");
  const { default: AccountSecurity } = await import("../src/components/AccountSecurity");
  const { MemoryRouter } = await import("react-router-dom");
  const { renewSession, endSession } = await import("../src/authSession");
  const form = render(<MemoryRouter><Signup /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Username"), {target:{value:"pending_integration_teacher"}});
  fireEvent.change(screen.getByLabelText("Password"), {target:{value:"synthetic-pending-password"}});
  fireEvent.click(screen.getByRole("button", {name:"Request access"}));
  expect(await screen.findByRole("status")).toHaveTextContent("administrator must approve");
  await expect(login("pending_integration_teacher", "synthetic-pending-password")).rejects.toMatchObject({status:401});
  form.unmount();
  const admin = (await login("test_admin", "synthetic-test-password")).access_token;
  const panel = render(<AccountSecurity token={admin} />);
  const username = await screen.findByText("pending_integration_teacher");
  fireEvent.click(within(username.closest("tr")).getByRole("button", {name:"Approve access"}));
  await waitFor(() => expect(within(username.closest("tr")).getByRole("button", {name:"Disable"})).toBeEnabled());
  panel.unmount();
  const initial = await login("pending_integration_teacher", "synthetic-pending-password");
  const renewed = await renewSession(initial.access_token);
  expect(renewed.refresh_token).not.toBe(initial.refresh_token);
  expect((await getLearners(renewed.access_token)).total).toBeGreaterThan(50);
  await endSession();
  await expect(getLearners(renewed.access_token)).rejects.toMatchObject({status:401});
});

test("PDF statements arrive as private streamed downloads", async () => {
  const token=(await login("test_admin", "synthetic-test-password")).access_token;
  const [fee]=await getFees(token);
  const pdf=await request("download_fee_statement",{token,path:{fee_id:fee.id},download:true});
  expect(pdf.type).toBe("application/pdf");
  expect((await pdf.text()).startsWith("%PDF")).toBe(true);
});
