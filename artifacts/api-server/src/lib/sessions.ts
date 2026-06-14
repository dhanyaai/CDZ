import { randomBytes } from "node:crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

type Session = { userId: number; companyId: number; expiresAt: number };

const store = new Map<string, Session>();

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function createSession(userId: number, companyId: number): string {
  const token = generateToken();
  store.set(token, { userId, companyId, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getSession(token: string): { userId: number; companyId: number } | null {
  const s = store.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return { userId: s.userId, companyId: s.companyId };
}

export function updateSessionCompany(token: string, companyId: number): boolean {
  const s = store.get(token);
  if (!s) return false;
  s.companyId = companyId;
  return true;
}

export function getSessionUserId(token: string): number | null {
  return getSession(token)?.userId ?? null;
}

export function destroySession(token: string): void {
  store.delete(token);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
}, 1000 * 60 * 60).unref();

export const sessions = {
  get: (t: string) => getSession(t),
  delete: destroySession,
};
