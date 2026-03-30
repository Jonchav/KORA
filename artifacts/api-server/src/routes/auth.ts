import { Router } from "express";
import { createHash } from "crypto";

const router = Router();

function makeToken(password: string): string {
  return createHash("sha256")
    .update(`kora:${password}:private`)
    .digest("hex");
}

router.post("/auth/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return res.status(500).json({ error: "SITE_PASSWORD not configured" });
  }

  if (!password || password !== sitePassword) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = makeToken(sitePassword);
  return res.json({ token });
});

export function validateToken(token: string): boolean {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) return false;
  return token === makeToken(sitePassword);
}

export default router;
