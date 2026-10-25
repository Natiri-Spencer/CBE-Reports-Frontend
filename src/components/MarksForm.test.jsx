import { fireEvent, render, screen } from "@testing-library/react";
import MarksForm from "./MarksForm";
import { submitMarks } from "../api";

vi.mock("../api", () => ({ submitMarks: vi.fn() }));

beforeEach(() => {
  submitMarks.mockReset();
});

test("does not silently convert missing marks to zero", () => {
  render(<MarksForm token="test-token" />);
  fireEvent.change(screen.getByLabelText(/student name/i), {
    target: { value: "Test Learner" },
  });
  fireEvent.submit(screen.getByRole("button", { name: /submit marks/i }).closest("form"));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a score for every subject"
  );
  expect(submitMarks).not.toHaveBeenCalled();
});
