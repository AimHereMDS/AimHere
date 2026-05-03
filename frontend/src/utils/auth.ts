import type { Profile } from "../types/game";
import { apiFetch } from "./api";

const TOKEN_KEY = "aim-here-auth-token";

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: Profile;
};

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function loginWithPassword(email: string, password: string) {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.access_token);
  return response.user;
}

export async function registerWithPassword(email: string, password: string) {
  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.access_token);
  return response.user;
}

export async function fetchCurrentUser() {
  return apiFetch<Profile>("/auth/me");
}
