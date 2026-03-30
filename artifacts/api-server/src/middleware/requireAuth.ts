import { type Request, type Response, type NextFunction } from "express";
import { validateToken } from "../routes/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers["x-kora-token"] as string | undefined;

  if (!token || !validateToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
