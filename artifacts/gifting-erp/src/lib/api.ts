export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    setToken(null);
    if (!location.pathname.endsWith("/login")) {
      location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/login`;
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const json = JSON.parse(text);
      throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(text.includes("<") ? `Server error (${res.status})` : text || `HTTP ${res.status}`);
      }
      throw e;
    }
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
