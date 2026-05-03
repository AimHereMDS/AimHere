import { getAuthToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
  };
  new Headers(options.headers).forEach((value, key) => {
    headers[key] = value;
  });
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}
