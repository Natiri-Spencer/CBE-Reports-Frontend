import { webcrypto } from "node:crypto";
import { request, mutate } from "./contractClient";

const learnerId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn()); sessionStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

test("the OpenAPI contract rejects old camelCase and name-based mark writes", async () => {
  await expect(request("submit_marks", { token: "token", idempotencyKey: "request-1", body: { students: [{ name: "Test", creativeArts: 50 }] } })).rejects.toThrow("API contract mismatch");
  expect(fetch).not.toHaveBeenCalled();
});

test("the response contract requires paginated records", async () => {
  fetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
  await expect(request("list_marks", { token: "token" })).rejects.toThrow("API contract mismatch");
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }), { status: 200 }));
  expect((await request("list_marks", { token: "token" })).items).toEqual([]);
});

test("network retries and module reloads reuse the saved key; successful new intents use a new key", async () => {
  const body = { category: "school", amount: 250, payment_date: "2026-10-25" };
  const payment = { id: 1, fee_id: 1, ...body, reference: null, note: null, is_opening_balance: false };
  fetch.mockRejectedValueOnce(new TypeError("Response lost"));
  await expect(mutate("record_payment", body, "test-token", { fee_id: 1 })).rejects.toThrow("Response lost");
  const firstKey = fetch.mock.calls[0][1].headers["Idempotency-Key"];
  vi.resetModules();
  const { mutate: reloaded } = await import("./contractClient");
  fetch.mockImplementation(async () => new Response(JSON.stringify(payment), { status: 200 }));
  await reloaded("record_payment", body, "test-token", { fee_id: 1 });
  expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe(firstKey);
  await reloaded("record_payment", body, "test-token", { fee_id: 1 });
  expect(fetch.mock.calls[2][1].headers["Idempotency-Key"]).not.toBe(firstKey);
});

test("learner creation follows the published UUID response contract", async () => {
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: learnerId, name: "Test", class_name: "7", created_at: "2026-10-25T10:00:00Z" }), { status: 201 }));
  const value = await request("create_learner", { token: "test-token", idempotencyKey: "request-2", body: { name: "Test", class_name: "7" } });
  expect(value.id).toBe(learnerId);
});

test("an expired login does not discard a pending payment key", async () => {
  const body = { category: "school", amount: 125, payment_date: "2026-10-25" };
  const firstToken = `header.${btoa(JSON.stringify({ sub: "admin", exp: 1 }))}.old`;
  const newToken = `header.${btoa(JSON.stringify({ sub: "admin", exp: 9999999999 }))}.new`;
  fetch.mockRejectedValueOnce(new TypeError("Response lost"));
  await expect(mutate("record_payment", body, firstToken, { fee_id: 2 })).rejects.toThrow();
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Login expired" }), { status: 401 }));
  await expect(mutate("record_payment", body, firstToken, { fee_id: 2 })).rejects.toThrow("Login expired");
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 2, fee_id: 2, ...body, reference: null, note: null, is_opening_balance: false }), { status: 200 }));
  await mutate("record_payment", body, newToken, { fee_id: 2 });
  expect(new Set(fetch.mock.calls.map(([, options]) => options.headers["Idempotency-Key"])).size).toBe(1);
});
