import { getAuthToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 35000;

export type ApiFetchOptions = RequestInit & {
  timeoutMs?: number | null;
  timeoutMessage?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        const detail = (parsed as { detail?: unknown }).detail;
        if (typeof detail === "string" && detail.trim()) return detail;
        if (Array.isArray(detail)) {
          const first = detail.find(
            (item) => item && typeof item === "object" && typeof (item as { msg?: unknown }).msg === "string",
          );
          if (first) return (first as { msg: string }).msg;
        }
      }
    } catch {
      return text;
    }
  }
  return `Request failed with ${response.status}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, timeoutMessage, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
  };
  new Headers(fetchOptions.headers).forEach((value, key) => {
    headers[key] = value;
  });
  const shouldTimeout = !fetchOptions.signal && timeoutMs !== null && timeoutMs > 0;
  const controller = shouldTimeout ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs !== null ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller?.signal,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (!controller) throw new Error("Request was cancelled");
      const timeoutSeconds = timeoutMs !== null ? timeoutMs / 1000 : DEFAULT_TIMEOUT_MS / 1000;
      throw new Error(timeoutMessage ?? `Request timed out after ${timeoutSeconds}s`);
    }
    throw err;
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }
}
