import { renewSession, sessionId } from "./authSession";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import contract from "./generated/openapi.json";
import { API_URL } from "./config";

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ $id: "school-contract", components: contract.components });
const operations = new Map();
const validators = new Map();
for (const [path, methods] of Object.entries(contract.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (operation.operationId) operations.set(operation.operationId, { path, method: method.toUpperCase(), ...operation });
  }
}

function validate(key, schema, data) {
  if (!validators.has(key)) validators.set(key, ajv.compile({ ...schema, components: contract.components }));
  const validator = validators.get(key);
  if (!validator(data)) throw new Error(`API contract mismatch: ${ajv.errorsText(validator.errors.slice(0, 3), { separator: "; " })}${validator.errors.length > 3 ? " (additional fields also differ)" : ""}`);
}

export async function request(operationId, { token, path = {}, query = {}, body, idempotencyKey, download = false, _retried = false } = {}) {
  // A component may still hold the access token from before a background renewal.
  const current = localStorage.getItem("token");
  if (token && sessionId(token) && sessionId(current) === sessionId(token)) token = current;
  const operation = operations.get(operationId);
  if (!operation) throw new Error(`Unknown API operation: ${operationId}`);
  const cleanQuery = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  const headerValues = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  for (const [location, data] of [["path", path], ["query", cleanQuery], ["header", headerValues]]) {
    const parameters = (operation.parameters || []).filter((item) => item.in === location);
    validate(`${operationId}:${location}`, {
      type: "object", properties: Object.fromEntries(parameters.map((item) => [item.name, item.schema])),
      required: parameters.filter((item) => item.required).map((item) => item.name), additionalProperties: false,
    }, data);
  }
  const content = operation.requestBody?.content;
  const contentType = content?.["application/json"] ? "application/json" : content?.["application/x-www-form-urlencoded"] ? "application/x-www-form-urlencoded" : null;
  if (contentType) validate(`${operationId}:body`, content[contentType].schema, body);
  const pathname = operation.path.replace(/\{([^}]+)\}/g, (_, name) => encodeURIComponent(path[name]));
  const params = new URLSearchParams(cleanQuery);
  const response = await fetch(`${API_URL}${pathname}${params.size ? `?${params}` : ""}`, {
    method: operation.method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headerValues,
      ...(contentType ? { "Content-Type": contentType } : {}) },
    ...(body !== undefined ? { body: contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(body) : JSON.stringify(body) } : {}),
  });
  if (response.status === 401 && token && !_retried && operationId !== "logout") {
    try {
      const renewed = await renewSession(token);
      return request(operationId, { token: renewed.access_token, path, query, body, idempotencyKey, download, _retried: true });
    } catch { /* Return the original authentication failure. */ }
  }
  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed (${response.status})`;
    try {
      const detail = JSON.parse(text).detail;
      message = Array.isArray(detail) ? detail.map((item) => `${item.loc?.slice(1).join(".") || "Request"}: ${item.msg}`).join("; ") : detail || message;
    } catch { /* Plain-text errors are already readable. */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (download) return response.blob();
  const result = await response.json();
  const schema = operation.responses[String(response.status)]?.content?.["application/json"]?.schema;
  if (schema) validate(`${operationId}:response:${response.status}`, schema, result);
  return result;
}

const pending = new Map();
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

// Keep one key across network errors and tab reloads. Successful responses end
// that intent, so a later intentional identical payment gets a fresh key.
export async function mutate(operation, body, token, path = {}) {
  let actor = token;
  try { actor = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch { /* Opaque test or external token. */ }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical({ actor, operation, path, body }))));
  const storageKey = `school-pending:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  let key = pending.get(storageKey);
  try { key ||= sessionStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  key ||= crypto.randomUUID();
  pending.set(storageKey, key);
  try { sessionStorage.setItem(storageKey, key); } catch { /* In-memory retry still works. */ }
  const forget = () => {
    pending.delete(storageKey);
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
  };
  try {
    const result = await request(operation, { token, path, body, idempotencyKey: key });
    forget();
    return result;
  } catch (error) {
    // Authentication can expire after an earlier attempt committed. Keep its
    // key through sign-in so a lost response cannot become a second payment.
    if (error.status >= 400 && error.status < 500 && ![401, 403].includes(error.status)) forget();
    throw error;
  }
}
