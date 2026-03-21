export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ──────────────────────────────────────────────────────────────
// Security: The JWT access token lives ONLY in memory.
// Storing it in localStorage would expose it to XSS attacks.
// The HttpOnly refresh cookie handles persistence across sessions.
// We keep only a boolean session-hint flag in localStorage so we
// know whether to attempt a silent refresh on page load.
// ──────────────────────────────────────────────────────────────
const HAS_SESSION_KEY = "eventhub_has_session";

// In-memory token store — cleared on every page reload (intentional).
// The refresh cookie rehydrates it transparently via refreshAccessToken().
let _accessToken = null;

export const getSessionHint = () => {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(HAS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

export const setSessionHint = (enabled) => {
  try {
    if (typeof localStorage === "undefined") return;
    if (enabled) {
      localStorage.setItem(HAS_SESSION_KEY, "1");
    } else {
      localStorage.removeItem(HAS_SESSION_KEY);
      // Also remove the legacy token key if it was ever stored (migration safety)
      localStorage.removeItem("eventhub_access_token");
      _accessToken = null;
    }
  } catch {
    // ignore storage failures
  }
};

// One-time migration: purge the old insecure localStorage token key
try {
  if (typeof localStorage !== "undefined" && localStorage.getItem("eventhub_access_token")) {
    localStorage.removeItem("eventhub_access_token");
  }
} catch { /* ignore */ }

/** Returns the current in-memory access token (never touches localStorage). */
export const getStoredToken = () => _accessToken;

/** Stores the access token in memory only — NOT in localStorage. */
export const setStoredToken = (token) => {
  _accessToken = token || null;
};

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return null;
  }
})();

if (API_ORIGIN && typeof document !== "undefined") {
  const ensureLink = (rel) => {
    const selector = `link[rel="${rel}"][href="${API_ORIGIN}"]`;
    if (document.querySelector(selector)) return;
    const link = document.createElement("link");
    link.rel = rel;
    link.href = API_ORIGIN;
    if (rel === "preconnect") {
      link.crossOrigin = "";
    }
    document.head.appendChild(link);
  };

  ensureLink("dns-prefetch");
  ensureLink("preconnect");
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;
let sessionDefinitelyGone = false;

const refreshAccessToken = async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    credentials: "include",
  });

  if (!res.ok) {
    setSessionHint(false);
    sessionDefinitelyGone = true;
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => null);
  const token = data?.data?.access || data?.access;
  if (token) {
    setStoredToken(token);      // store in memory only
  }

  setSessionHint(true);
  sessionDefinitelyGone = false;
  return token;
};

async function request(path, options = {}, retry = true) {
  const url = `${API_BASE_URL}${path}`;
  const token = getStoredToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && retry) {
    if (!getSessionHint() && !getStoredToken()) {
      const error = new Error("Session expired. Please log in again.");
      error.status = 401;
      throw error;
    }

    if (sessionDefinitelyGone) {
      const error = new Error("Session expired. Please log in again.");
      error.status = 401;
      throw error;
    }

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;  // prevent stale promises from being awaited
        });
      }
      const newToken = await refreshPromise;

      // Retry the original request with fresh token
      return request(
        path,
        {
          ...options,
          headers: {
            ...options.headers,
            ...(newToken ? { "Authorization": `Bearer ${newToken}` } : {}),
          },
        },
        false // don't retry again
      );
    } catch {
      const error = new Error("Session expired. Please log in again.");
      error.status = 401;
      throw error;
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    const message =
      data?.error?.message ||
      data?.detail ||
      "Something went wrong. Please try again.";
    const error = new Error(message);
    error.response = data;
    error.status = res.status;
    throw error;
  }

  return data?.data ?? data;
}

const extractFilename = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?\"?([^\";\n]+)\"?/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const download = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getStoredToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  
  const res = await fetch(url, { 
    headers,
    credentials: "include" 
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      data?.error?.message ||
      data?.detail ||
      "Download failed. Please try again.";
    const error = new Error(message);
    error.response = data;
    error.status = res.status;
    throw error;
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filename = extractFilename(disposition, "export.csv");
  return { blob, filename };
};

export const api = {
  request,
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) =>
    request(path, {
      method: "POST",
      body: formData,
      headers: {},
    }),
  patchForm: (path, formData) =>
    request(path, {
      method: "PATCH",
      body: formData,
      headers: {},
    }),
  download,
};

export const resetSessionState = (token = null) => {
  sessionDefinitelyGone = false;
  setSessionHint(true);
  if (token) {
    setStoredToken(token);
  }
};

export const wakeUpServer = () => {
  try {
    fetch(`${API_BASE_URL}/api/health/`, { method: 'GET', keepalive: true }).catch(() => {});
  } catch {
    // ignore
  }
};
