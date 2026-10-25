import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LearnerPicker from "./LearnerPicker";
import { getLearners, createLearner } from "../api";

vi.mock("../api", () => ({ getLearners: vi.fn(), createLearner: vi.fn() }));

test("namesakes remain distinct and learner pagination requests the next page", async () => {
  const first = { id: "11111111-1111-4111-8111-111111111111", name: "Same Name", class_name: "7" };
  const second = { ...first, id: "22222222-2222-4222-8222-222222222222" };
  getLearners.mockResolvedValueOnce({ items: [first, second], total: 51, limit: 50, offset: 0 })
    .mockResolvedValueOnce({ items: [], total: 51, limit: 50, offset: 50 });
  const select = vi.fn();
  render(<LearnerPicker token="test-token" value={null} onChange={select} />);
  await screen.findByRole("option", { name: /22222222/ });
  fireEvent.change(screen.getByLabelText(/^Learner$/), { target: { value: second.id } });
  expect(select).toHaveBeenCalledWith(second);
  fireEvent.click(screen.getByRole("button", { name: "Next learners" }));
  await waitFor(() => expect(getLearners).toHaveBeenLastCalledWith("test-token", { offset: 50, limit: 50, search: "" }));
});
