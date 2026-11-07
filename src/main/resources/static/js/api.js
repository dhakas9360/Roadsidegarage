const TOKEN_KEY = "roadfix.session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY));
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const session = getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    setSession(null);
    window.location.hash = "#/login";
    throw new ApiError("Session expired, please log in again", 401);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text; // some endpoints (e.g. /auth/register) respond with a plain-text body
    }
  }

  if (!res.ok) {
    // backend sends {error: "..."}, a plain string, or a {field: message} map for validation failures
    const fieldErrors =
      data && typeof data === "object" && !data.error ? Object.values(data).filter((v) => typeof v === "string") : [];
    const message =
      data?.error ||
      (typeof data === "string" ? data : null) ||
      (fieldErrors.length ? fieldErrors.join(" · ") : null) ||
      (res.status >= 500 ? "Server error — please try again in a moment." : "Something went wrong");
    throw new ApiError(message, res.status);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  put: (path, body) => request("PUT", path, body),
};
