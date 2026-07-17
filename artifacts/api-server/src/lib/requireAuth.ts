import type { Request, Response, NextFunction } from "express";
import { getSession } from "./sessions";

const PUBLIC_PREFIXES = ["/v1/auth/login", "/healthz"];

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (PUBLIC_PREFIXES.some((p) => req.path === p || req.path.startsWith(p + "/"))) {
    next();
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const session = await getSession(auth.slice(7));
  if (session == null) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = session.userId;
  req.companyId = session.companyId;
  req.userRole = session.role;
  next();
}
