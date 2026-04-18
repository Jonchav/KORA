import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://koraframe.com";

// ── Credit pack definitions (one-time purchases) ────────────────────────────
export const CREDIT_PACKS = [
  { id: "pack_10",  label: "10 Generaciones",  credits: 10,  priceCents: 100,  priceLabel: "$1" },
  { id: "pack_30",  label: "60 Generaciones",  credits: 60,  priceCents: 499,  priceLabel: "$4.99" },
  { id: "pack_120", label: "150 Generaciones", credits: 150, priceCents: 999,  priceLabel: "$9.99" },
];

// ── GET /api/billing/me — user credits ───────────────────────────────────────
router.get("/billing/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.sub)).limit(1);
    if (!rows.length) { res.status(404).json({ message: "User not found" }); return; }
    const u = rows[0];

    res.json({
      tier: u.tier,
      credits: u.credits,
    });
  } catch (err) {
    console.error("billing/me error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// ── POST /api/billing/checkout — create Stripe checkout session ─────────────
router.post("/billing/checkout", requireAuth, async (req: Request, res: Response) => {
  const { type, itemId } = req.body as { type: "pack"; itemId: string };

  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.sub)).limit(1);
  if (!rows.length) { res.status(404).json({ message: "User not found" }); return; }
  const user = rows[0];

  try {
    let session: Stripe.Checkout.Session;

    if (type === "pack") {
      const pack = CREDIT_PACKS.find(p => p.id === itemId);
      if (!pack) { res.status(400).json({ message: "Invalid pack" }); return; }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.stripeCustomerId ? undefined : req.user!.email,
        customer: user.stripeCustomerId || undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `KORA — ${pack.label}`,
              description: `${pack.credits} generaciones con IA. Pago único, sin caducidad.`,
            },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        }],
        metadata: {
          userId: req.user!.sub,
          type: "pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
        success_url: `${FRONTEND_URL}/?payment=success&credits=${pack.credits}`,
        cancel_url: `${FRONTEND_URL}/?payment=cancelled`,
      });

    } else {
      res.status(400).json({ message: "Invalid type" });
      return;
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

// ── POST /api/billing/portal — Stripe Customer Portal ───────────────────────
router.post("/billing/portal", requireAuth, async (req: Request, res: Response) => {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.sub)).limit(1);
  if (!rows.length || !rows[0].stripeCustomerId) {
    res.status(400).json({ message: "No Stripe customer found" }); return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripeCustomerId,
      return_url: FRONTEND_URL,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    res.status(500).json({ message: "Failed to open billing portal" });
  }
});

// ── POST /api/billing/webhook — Stripe webhooks ─────────────────────────────
router.post("/billing/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      const userId = meta.userId;

      if (!userId || meta.type !== "pack") {
        res.json({ received: true });
        return;
      }

      const credits = parseInt(meta.credits || "0");
      if (credits <= 0) { res.json({ received: true }); return; }

      const now = new Date();
      const rows = await db.select({ credits: usersTable.credits })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (rows.length) {
        await db.update(usersTable)
          .set({
            credits: rows[0].credits + credits,
            stripeCustomerId: (session.customer as string) || undefined,
            updatedAt: now,
          })
          .where(eq(usersTable.id, userId));
        console.log(`[webhook] +${credits} generaciones → user ${userId} (total: ${rows[0].credits + credits})`);
      } else {
        console.warn(`[webhook] user not found: ${userId}`);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  res.json({ received: true });
});

export default router;
