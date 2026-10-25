import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./components/TeacherDashboard", () => ({ default: () => <div>Teacher dashboard</div> }));
vi.mock("./components/AdminDashboard", () => ({ default: () => <div>Finance dashboard</div> }));
vi.mock("./components/AdminHome", () => ({ default: () => <div>Admin dashboard</div> }));

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
