import { Router, type IRouter, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { signToken, requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post("/auth/google", async (req: Request, res: Response) => {
  const { credential } = req.body as { credential?: string };

  if (!credential) {
    res.status(400).json({ message: "Missing credential" });
    return;
  }

  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ message: "Server is not configured for Google auth" });
    return;
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      res.status(401).json({ message: "Invalid Google credential" });
      return;
    }

    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || "",
    };

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ message: "Failed to verify Google credential" });
  }
});

router.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
