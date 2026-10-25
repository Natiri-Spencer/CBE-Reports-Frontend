import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./components/TeacherDashboard", () => ({ default: () => <div>Teacher dashboard</div> }));
vi.mock("./components/AdminDashboard", () => ({ default: () => <div>Finance dashboard</div> }));
vi.mock("./components/AdminHome", () => ({ default: () => <div>Admin dashboard</div> }));
vi.mock("./components/LearnerPicker", () => ({ default: () => <div>Learner picker</div> }));

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("renders the public home page", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /welcome to cbe reports/i })
  ).toBeInTheDocument();
});

test("redirects an unauthenticated user away from marks", () => {
  window.history.pushState({}, "", "/marks");
  render(<App />);
  expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
});

function storeSession(role, expiresIn = 3600) {
  const payload = btoa(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + expiresIn }));
  localStorage.setItem("token", `header.${payload}.signature`);
  localStorage.setItem("role", role);
}

test("keeps an administrator on a finance deep link", () => {
  storeSession("admin");
  window.history.pushState({}, "", "/admin/finance");
  render(<App />);
  expect(screen.getByText("Finance dashboard")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/admin/finance");
});

test("keeps a teacher on the marks screen", () => {
  storeSession("teacher");
  window.history.pushState({}, "", "/teacher/marks");
  render(<App />);
  expect(screen.getByRole("button", { name: /submit marks/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/teacher/marks");
});

test("clears an expired session", () => {
  storeSession("admin", -60);
  window.history.pushState({}, "", "/admin/finance");
  render(<App />);
  expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("role")).toBeNull();
});
