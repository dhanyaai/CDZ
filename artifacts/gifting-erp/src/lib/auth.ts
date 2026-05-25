import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken, setToken } from "./api";

export function initAuth(): void {
  setAuthTokenGetter(() => getToken());
}

export type AuthUser = { id: number; name: string; email: string; role: string };

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function setStoredUser(user: AuthUser | null): void {
  if (user) localStorage.setItem("auth_user", JSON.stringify(user));
  else localStorage.removeItem("auth_user");
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem("auth_token");
  if (token) {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
  }
  setToken(null);
  setStoredUser(null);
  location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/login`;
}
