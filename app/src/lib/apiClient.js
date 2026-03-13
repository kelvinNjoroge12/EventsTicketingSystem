export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

const getAuthTokens = () => {
  try {
    const raw = localStorage.getItem("eventhub_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveAuthTokens = (payload) => {
  if (!payload) return;
  localStorage.setItem("eventhub_auth", JSON.stringify(payload));
};

const clearAuthTokens = () => {
  localStorage.removeItem("eventhub_auth");
};

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

const refreshAccessToken = async () => {
  const stored = getAuthTokens();
  const refresh = stored?.tokens?.refresh;
  if (!refresh) throw new Error("No refresh token available");

  const res = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    clearAuthTokens();
    throw new Error("Session expired. Please log in again.");
  }

  // Update stored tokens with new access token (and possibly new refresh token)
  const newTokens = {
    ...stored,
    tokens: {
      ...stored.tokens,
      access: data?.data?.access || data?.access,
      ...(data?.data?.refresh ? { refresh: data.data.refresh } : {}),
      ...(data?.refresh ? { refresh: data.refresh } : {}),
    },
  };
  saveAuthTokens(newTokens);
  return newTokens.tokens.access;
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getTokenExpiryMs = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
};

const shouldRefreshSoon = (token, skewMs = 60000) => {
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return false;
  return expMs - Date.now() <= skewMs;
};

async function request(path, options = {}, retry = true) {
  const url = `${API_BASE_URL}${path}`;
  const tokens = getAuthTokens();
  let accessToken = tokens?.tokens?.access;

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (accessToken && tokens?.tokens?.refresh && shouldRefreshSoon(accessToken)) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }
      accessToken = await refreshPromise;
    } catch {
      // Fall back to existing token; 401 handler will clear if needed
    }
  }

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && retry && tokens?.tokens?.refresh) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
        });
      }
      const newAccessToken = await refreshPromise;

      // Retry the original request with fresh token
      return request(
        path,
        {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        },
        false // don't retry again
      );
    } catch {
      clearAuthTokens();
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
  const tokens = getAuthTokens();
  const headers = {};
  if (tokens?.tokens?.access) {
    headers.Authorization = `Bearer ${tokens.tokens.access}`;
  }

  const res = await fetch(url, { headers });
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
  getAuthTokens,
  saveAuthTokens,
  clearAuthTokens,
};
