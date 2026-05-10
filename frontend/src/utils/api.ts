import { getAuthToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 35000;

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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
  };
  new Headers(options.headers).forEach((value, key) => {
    headers[key] = value;
  });
  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller?.signal,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }
}
