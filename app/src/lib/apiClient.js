export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const HAS_SESSION_KEY = "eventhub_has_session";

const getSessionHint = () => {
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
    }
  } catch {
    // ignore storage failures
  }
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

const refreshAccessToken = async () => {
  if (!getSessionHint()) {
    throw new Error("No active session.");
  }
  const res = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    credentials: "include",
  });

  if (!res.ok) {
    setSessionHint(false);
    throw new Error("Session expired. Please log in again.");
  }
};

async function request(path, options = {}, retry = true) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && retry) {
    try {
      if (!getSessionHint()) {
        const error = new Error("Session expired. Please log in again.");
        error.status = 401;
        throw error;
      }
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }
      await refreshPromise;

      // Retry the original request with fresh token
      return request(
        path,
        {
          ...options,
          headers: options.headers,
        },
        false // don't retry again
      );
    } catch {
      // Re-throw so callers (e.g. login redirect) can handle
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

  // Our backend wraps successful responses as { success, data, message? }
  return data?.data ?? data;
}

const extractFilename = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const download = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { credentials: "include" });
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
      headers: {}, // Let browser set Content-Type for multipart/form-data
    }),
  patchForm: (path, formData) =>
    request(path, {
      method: "PATCH",
      body: formData,
      headers: {},
    }),
  download,
};

// Proactively wakes up the Render free-tier instance on first load
export const wakeUpServer = () => {
  try {
    fetch(`${API_BASE_URL}/api/health/`, { method: 'GET', keepalive: true }).catch(() => {});
  } catch {
    // ignore
  }
};
