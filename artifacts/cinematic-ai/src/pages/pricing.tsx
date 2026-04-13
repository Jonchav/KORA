import { motion } from "framer-motion";
import { ArrowLeft, Zap, Check, Star, AlertTriangle, ExternalLink } from "lucide-react";
import { useCheckout, useBillingPortal, useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

const PACKS = [
  { id: "pack_25",  credits: 25,  price: "$1",  perCredit: "$0.04" },
  { id: "pack_70",  credits: 70,  price: "$2",  perCredit: "$0.03" },
  { id: "pack_220", credits: 220, price: "$5",  perCredit: "$0.02", best: true },
];

const PLANS = [
  {
    id: "plan_mini",
    label: "MINI",
    tier: "mini",
    price: "$3.99",
    period: "/mo",
    credits: 100,
    features: ["100 credits / month", "All 12 styles", "4 social formats", "HD quality"],
  },
  {
    id: "plan_plus",
    label: "PLUS",
    tier: "plus",
    price: "$7.99",
    period: "/mo",
    credits: 280,
    features: ["280 credits / month", "All 12 styles", "4 social formats", "HD quality"],
    best: true,
  },
  {
    id: "plan_pro",
    label: "PRO",
    tier: "pro",
    price: "$14.99",
    period: "/mo",
    credits: 700,
    features: ["700 credits / month", "All 12 styles", "4 social formats", "HD quality"],
  },
];

interface PricingPageProps {
  onBack: () => void;
}

export function PricingPage({ onBack }: PricingPageProps) {
  const { data: billing } = useBilling();
  const checkout = useCheckout();
  const portal = useBillingPortal();

  const hasSub = billing && billing.tier !== "free";

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute top-[40%] right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Checkout error banner */}
        {(checkout.isError || portal.isError) && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-8 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200 mb-0.5">Payment error</p>
              <p className="text-xs text-red-400/80">
                {checkout.error?.message || portal.error?.message || "Could not connect to payment service. Please try again."}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">KORA CREDITS</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight"
          >
            Get More Credits
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-base max-w-md mx-auto"
          >
            1 credit = 1 AI transformation. Free plan: 10 credits / month.
          </motion.p>

          {billing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
            >
              <span className="text-zinc-400">Current balance:</span>
              <span className="font-mono font-bold text-white">{billing.credits} credits</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{billing.tier}</span>
            </motion.div>
          )}
        </div>

        {/* Credit packs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600">One-time packs</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-12">
            {PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={cn(
                  "relative glass-panel rounded-2xl p-5 flex flex-col gap-4 border transition-all",
                  pack.best
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/[0.06] hover:border-white/20"
                )}
              >
                {pack.best && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary text-[10px] font-bold text-black tracking-widest uppercase">
                      <Star className="w-2.5 h-2.5" /> Best Value
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-3xl font-black text-white font-mono">{pack.price}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{pack.perCredit} per credit</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{pack.credits}</div>
                  <div className="text-zinc-500 text-xs">credits</div>
                </div>
                <button
                  onClick={() => checkout.mutate({ type: "pack", itemId: pack.id })}
                  disabled={checkout.isPending}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                    pack.best
                      ? "bg-primary text-black hover:bg-primary/90"
                      : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                  )}
                >
                  {checkout.isPending ? "Loading..." : `Buy ${pack.credits} credits`}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Subscriptions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600">Monthly plans</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((plan, i) => {
              const isCurrent = billing?.tier === plan.tier;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className={cn(
                    "relative glass-panel rounded-2xl p-5 flex flex-col gap-4 border transition-all",
                    plan.best
                      ? "border-primary/40 bg-primary/5"
                      : "border-white/[0.06] hover:border-white/20",
                    isCurrent && "border-green-500/30 bg-green-500/5"
                  )}
                >
                  {plan.best && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary text-[10px] font-bold text-black tracking-widest uppercase">
                        <Star className="w-2.5 h-2.5" /> Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-green-500 text-[10px] font-bold text-black tracking-widest uppercase">
                        <Check className="w-2.5 h-2.5" /> Current Plan
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-mono tracking-widest text-zinc-500 mb-1">{plan.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">{plan.price}</span>
                      <span className="text-zinc-500 text-xs">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <Check className="w-3 h-3 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent && hasSub ? (
                    <button
                      onClick={() => portal.mutate()}
                      disabled={portal.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                    >
                      {portal.isPending ? "Loading..." : "Manage"}
                    </button>
                  ) : (
                    <button
                      onClick={() => checkout.mutate({ type: "subscription", itemId: plan.id })}
                      disabled={checkout.isPending}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                        plan.best
                          ? "bg-primary text-black hover:bg-primary/90"
                          : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                      )}
                    >
                      {checkout.isPending ? "Loading..." : `Get ${plan.label}`}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Manage existing subscription */}
        {hasSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <button
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
            >
              Manage or cancel subscription
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-zinc-700 mt-10"
        >
          Secure payments via Stripe · Cancel anytime · Credits never expire for paid plans
        </motion.p>
      </div>
    </div>
  );
}
