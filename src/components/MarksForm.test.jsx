import { act, fireEvent, render, screen } from "@testing-library/react";
import MarksForm from "./MarksForm";
import { submitMarks, getLearners } from "../api";

vi.mock("../api", () => ({ submitMarks: vi.fn(), getLearners: vi.fn(), createLearner: vi.fn() }));
const learnerId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  submitMarks.mockReset();
  getLearners.mockResolvedValue({ items: [{ id: learnerId, name: "Test Learner", class_name: "7" }], total: 1, offset: 0, limit: 50 });
});

test("blocks repeated submissions and preserves input after a failed save", async () => {
  let rejectSave;
  submitMarks.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject; }));
  render(<MarksForm token="test-token" />);
  await screen.findByRole("option", { name: /Test Learner/ });
  fireEvent.change(screen.getByLabelText(/^Learner$/), { target: { value: learnerId } });
  screen.getAllByRole("spinbutton").filter((input) => input.min === "0").forEach((input) => fireEvent.change(input, { target: { value: "0" } }));
  const form = screen.getByRole("button", { name: /submit marks/i }).closest("form");
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(submitMarks).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: /saving marks/i })).toBeDisabled();
  await act(async () => rejectSave(new Error("Save unavailable")));
  expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable");
  expect(screen.getByLabelText(/^Learner$/)).toHaveValue(learnerId);
  expect(screen.getByRole("button", { name: /submit marks/i })).toBeEnabled();
});

test("does not silently convert missing marks to zero", async () => {
  render(<MarksForm token="test-token" />);
  await screen.findByRole("option", { name: /Test Learner/ });
  fireEvent.change(screen.getByLabelText(/^Learner$/), { target: { value: learnerId } });
  fireEvent.submit(screen.getByRole("button", { name: /submit marks/i }).closest("form"));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a score for every subject"
  );
  expect(submitMarks).not.toHaveBeenCalled();
});
