import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TeacherDashboard from "./TeacherDashboard";
import { getMarks } from "../api";

vi.mock("../api", () => ({ getMarks: vi.fn(), downloadMarks: vi.fn() }));
vi.mock("./MarksForm", () => ({
  default: ({ onResults }) => <button onClick={() => onResults([{ id: 2, learner_id: "amina", name: "Amina", total: 810, rank: 1, class_name: "7", academic_year: new Date().getFullYear(), term: new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3 }])}>Save test marks</button>,
}));

test("updating a learner refreshes rankings without adding a duplicate row", async () => {
  getMarks.mockResolvedValueOnce({ items: [
    { id: 1, name: "Brian", total: 720, rank: 1 },
    { id: 2, name: "Amina", total: 630, rank: 2 },
  ], total: 2, offset: 0, limit: 50 }).mockResolvedValueOnce({ items: [
    { id: 2, name: "Amina", total: 810, rank: 1 },
    { id: 1, name: "Brian", total: 720, rank: 2 },
  ], total: 2, offset: 0, limit: 50 });
  render(<TeacherDashboard token="test-token" />);
  await screen.findByText("Amina");
  fireEvent.click(screen.getByRole("button", { name: "Save test marks" }));
  await waitFor(() => expect(getMarks).toHaveBeenCalledTimes(2));
  await waitFor(() => {
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("Amina")).toBeInTheDocument();
    expect(within(rows[2]).getAllByRole("cell").at(-2)).toHaveTextContent("2");
  });
});
