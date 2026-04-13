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
// Each pack uses a Stripe Price ID (created via Stripe dashboard or API first-run)
// Format: { id, label, credits, price_usd_cents }
export const CREDIT_PACKS = [
  { id: "pack_25",  label: "25 Credits",  credits: 25,  priceCents: 100,  priceLabel: "$1" },
  { id: "pack_70",  label: "70 Credits",  credits: 70,  priceCents: 200,  priceLabel: "$2" },
  { id: "pack_220", label: "220 Credits", credits: 220, priceCents: 500,  priceLabel: "$5" },
];

// ── Subscription plan definitions ───────────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  { id: "plan_mini", label: "MINI",  tier: "mini" as const, credits: 100, priceCents: 399,  priceLabel: "$3.99/mo",  description: "100 credits / month" },
  { id: "plan_plus", label: "PLUS",  tier: "plus" as const, credits: 280, priceCents: 799,  priceLabel: "$7.99/mo",  description: "280 credits / month" },
  { id: "plan_pro",  label: "PRO",   tier: "pro"  as const, credits: 700, priceCents: 1499, priceLabel: "$14.99/mo", description: "700 credits / month" },
];

// ── GET /api/billing/me — user tier + credits ────────────────────────────────
router.get("/billing/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.sub)).limit(1);
    if (!rows.length) { res.status(404).json({ message: "User not found" }); return; }
    const u = rows[0];

    // Monthly reset for free tier: reset to 10 on the 1st of every month
    const now = new Date();
    const resetAt = new Date(u.monthlyResetAt);
    const isNewMonth = now.getFullYear() > resetAt.getFullYear() ||
      now.getMonth() > resetAt.getMonth();
    if (isNewMonth && u.tier === "free") {
      await db.update(usersTable)
        .set({ credits: 10, monthlyResetAt: now, updatedAt: now })
        .where(eq(usersTable.id, u.id));
      u.credits = 10;
      u.monthlyResetAt = now;
    }

    res.json({
      tier: u.tier,
      credits: u.credits,
      monthlyResetAt: u.monthlyResetAt,
    });
  } catch (err) {
    console.error("billing/me error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// ── POST /api/billing/checkout — create Stripe checkout session ─────────────
router.post("/billing/checkout", requireAuth, async (req: Request, res: Response) => {
  const { type, itemId } = req.body as { type: "pack" | "subscription"; itemId: string };

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
              description: `${pack.credits} AI transformation credits. One-time purchase, no expiry.`,
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

    } else if (type === "subscription") {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === itemId);
      if (!plan) { res.status(400).json({ message: "Invalid plan" }); return; }

      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: user.stripeCustomerId ? undefined : req.user!.email,
        customer: user.stripeCustomerId || undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `KORA ${plan.label}`,
              description: plan.description,
            },
            unit_amount: plan.priceCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        metadata: {
          userId: req.user!.sub,
          type: "subscription",
          planId: plan.id,
          tier: plan.tier,
          credits: String(plan.credits),
        },
        success_url: `${FRONTEND_URL}/?payment=success&plan=${plan.tier}`,
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
      if (!userId) { res.json({ received: true }); return; }

      if (meta.type === "pack") {
        const credits = parseInt(meta.credits || "0");
        const now = new Date();

        // Fetch current credits then increment
        const rows = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (rows.length) {
          await db.update(usersTable)
            .set({
              credits: rows[0].credits + credits,
              stripeCustomerId: (session.customer as string) || undefined,
              updatedAt: now,
            })
            .where(eq(usersTable.id, userId));
        }
        console.log(`[webhook] +${credits} credits → user ${userId}`);

      } else if (meta.type === "subscription") {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === meta.planId);
        if (!plan) { res.json({ received: true }); return; }
        const now = new Date();
        await db.update(usersTable)
          .set({
            tier: plan.tier,
            credits: plan.credits,
            monthlyResetAt: now,
            stripeCustomerId: session.customer as string || undefined,
            stripeSubscriptionId: session.subscription as string || undefined,
            updatedAt: now,
          })
          .where(eq(usersTable.id, userId));
        console.log(`[webhook] subscription ${plan.tier} → user ${userId}`);
      }

    } else if (event.type === "customer.subscription.deleted") {
      // Subscription cancelled — downgrade to free
      const sub = event.data.object as Stripe.Subscription;
      const rows = await db.select().from(usersTable)
        .where(eq(usersTable.stripeSubscriptionId, sub.id)).limit(1);
      if (rows.length) {
        const now = new Date();
        await db.update(usersTable)
          .set({ tier: "free", credits: 10, stripeSubscriptionId: null, updatedAt: now })
          .where(eq(usersTable.id, rows[0].id));
        console.log(`[webhook] subscription cancelled → free tier user ${rows[0].id}`);
      }

    } else if (event.type === "invoice.paid") {
      // Monthly renewal — top up credits
      const invoice = event.data.object as any;
      const invoiceSubscriptionId: string | null =
        typeof invoice.subscription === "string" ? invoice.subscription :
        typeof invoice.subscription?.id === "string" ? invoice.subscription.id : null;
      if (!invoiceSubscriptionId) { res.json({ received: true }); return; }
      const rows = await db.select().from(usersTable)
        .where(eq(usersTable.stripeSubscriptionId, invoiceSubscriptionId)).limit(1);
      if (rows.length) {
        const user = rows[0];
        const plan = SUBSCRIPTION_PLANS.find(p => p.tier === user.tier);
        if (plan) {
          const now = new Date();
          await db.update(usersTable)
            .set({ credits: plan.credits, monthlyResetAt: now, updatedAt: now })
            .where(eq(usersTable.id, user.id));
          console.log(`[webhook] renewal +${plan.credits} credits → user ${user.id}`);
        }
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  res.json({ received: true });
});

export default router;
