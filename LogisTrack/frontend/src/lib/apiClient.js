export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function normalizeApiError(payload) {
  if (!payload) {
    return "Request failed.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (typeof payload === "object") {
    const messages = [];
    Object.entries(payload).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(" ")}`);
      } else if (typeof value === "string") {
        messages.push(`${field}: ${value}`);
      }
    });

    if (messages.length) {
      return messages.join(" | ");
    }
  }

  return "Request failed.";
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export async function publicRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(normalizeApiError(payload));
  }

  return payload;
}

export function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const output = query.toString();
  return output ? `?${output}` : "";
}

export async function parseApiResponse(response) {
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(normalizeApiError(payload));
  }

  return payload;
}
