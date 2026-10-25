import { webcrypto } from "node:crypto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { rememberSession, renewSession, endSession } from "./authSession";
import { mutate, request } from "./contractClient";
import Signup from "./components/Signup";
import AccountSecurity from "./components/AccountSecurity";

const jwt = (sid, exp = Math.floor(Date.now()/1000)+900) => `header.${btoa(JSON.stringify({sub:"42",role:"teacher",sid,exp}))}.signature`;
const tokens = (sid, refresh = "a".repeat(64)) => ({access_token:jwt(sid),refresh_token:refresh,token_type:"bearer",expires_in:900,refresh_expires_at:Math.floor(Date.now()/1000)+604800});
const response = (body,status=200) => ({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal("crypto",webcrypto);
});
afterEach(() => { vi.unstubAllGlobals(); });

test("parallel renewal rotates refresh only once and stores the new credentials", async () => {
  const old=tokens("session-one"), next=tokens("session-one","b".repeat(64));
  rememberSession(old);
  const fetcher=vi.fn().mockResolvedValue(response(next)); vi.stubGlobal("fetch",fetcher);
  const results=await Promise.all([renewSession(old.access_token),renewSession(old.access_token)]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({refresh_token:old.refresh_token});
  expect(sessionStorage.getItem("school-refresh")).toBe(next.refresh_token);
  expect(results[0]).toEqual(next); expect(results[1]).toEqual(next);
});

test("an authentication retry preserves the original mutation idempotency key", async () => {
  const old=tokens("session-one"), next=tokens("session-one","b".repeat(64)); rememberSession(old);
  const fetcher=vi.fn()
    .mockResolvedValueOnce(response({detail:"expired"},401))
    .mockResolvedValueOnce(response(next))
    .mockResolvedValueOnce(response({id:"11111111-1111-4111-8111-111111111111",name:"Test learner",class_name:"7",created_at:"2026-10-25T00:00:00Z"},201));
  vi.stubGlobal("fetch",fetcher);
  await mutate("create_learner",{name:"Test learner",class_name:"7"},old.access_token);
  const [first,,retried]=fetcher.mock.calls;
  expect(first[1].headers["Idempotency-Key"]).toEqual(retried[1].headers["Idempotency-Key"]);
  expect(retried[1].headers.Authorization).toBe(`Bearer ${next.access_token}`);
});

test("logout revokes the server session and retains credentials if the network fails", async () => {
  const old=tokens("session-one"); rememberSession(old);
  const fetcher=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response({msg:"Session revoked"}));
  vi.stubGlobal("fetch",fetcher);
  await expect(endSession()).rejects.toThrow("offline");
  expect(sessionStorage.getItem("school-refresh")).toBe(old.refresh_token);
  await endSession();
  expect(fetcher.mock.calls[1][0]).toMatch(/\/auth\/logout-refresh$/);
  expect(localStorage.getItem("token")).toBeNull(); expect(sessionStorage.getItem("school-refresh")).toBeNull();
});

test("renewal cannot substitute credentials belonging to another session", async () => {
  rememberSession(tokens("session-two")); const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
  await expect(renewSession(jwt("session-one"))).rejects.toThrow(/sign in/);
  expect(fetcher).not.toHaveBeenCalled();
});

test("signup requests approval without signing the teacher in", async () => {
  const fetcher=vi.fn().mockResolvedValue(response({msg:"Account request received. An administrator must approve access.",username:"pending",role:"teacher"},202));
  vi.stubGlobal("fetch",fetcher);
  render(<MemoryRouter><Signup /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Username"),{target:{value:"pending"}});
  fireEvent.change(screen.getByLabelText("Password"),{target:{value:"testing-password"}});
  fireEvent.click(screen.getByRole("button",{name:"Request access"}));
  expect(await screen.findByRole("status")).toHaveTextContent("administrator must approve");
  expect(fetcher).toHaveBeenCalledTimes(1); expect(localStorage.getItem("token")).toBeNull();
});

test("administrators can approve pending accounts and inspect login counts", async () => {
  let active=false;
  const fetcher=vi.fn(async(url,options)=> {
    if (url.includes("/monitoring")) return response({window_seconds:86400,failed:4,succeeded:12,pending:0});
    if (options.method==="PUT") { active=true; return response({id:1,username:"pending",role:"teacher",is_active:true}); }
    return response([{id:1,username:"pending",role:"teacher",is_active:active}]);
  });
  vi.stubGlobal("fetch",fetcher);
  render(<AccountSecurity token={jwt("admin-session")} />);
  expect(await screen.findByText(/4 failed logins/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button",{name:"Approve access"}));
  expect(await screen.findByRole("button",{name:"Disable"})).toBeEnabled();
  const update=fetcher.mock.calls.find(([url,opts])=>opts.method==="PUT");
  expect(update[0]).toMatch(/\/auth\/accounts\/1\/status$/);
  expect(JSON.parse(update[1].body)).toEqual({is_active:true});
});
