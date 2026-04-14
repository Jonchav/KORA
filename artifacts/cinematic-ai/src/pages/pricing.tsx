import { motion } from "framer-motion";
import { ArrowLeft, Zap, Check, Star, AlertTriangle, ShieldCheck, Infinity } from "lucide-react";
import { useCheckout, useBillingPortal, useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

const PACKS = [
  { id: "pack_20",  images: 20,  price: "$1",  priceCents: 100, perImage: "$0.05" },
  { id: "pack_75",  images: 75,  price: "$3",  priceCents: 300, perImage: "$0.04", best: true },
  { id: "pack_160", images: 160, price: "$5",  priceCents: 500, perImage: "$0.03" },
  { id: "pack_380", images: 380, price: "$10", priceCents: 1000, perImage: "$0.03" },
];

const PLAN = {
  id: "plan_creator",
  label: "CREATOR",
  tier: "creator",
  price: "$4.35",
  period: "/mes",
  images: 120,
  features: [
    "120 imágenes / mes",
    "Sin marca de agua",
    "Todos los estilos",
    "Sin límite diario",
    "Velocidad normal",
  ],
};

interface PricingPageProps {
  onBack: () => void;
}

export function PricingPage({ onBack }: PricingPageProps) {
  const { data: billing } = useBilling();
  const checkout = useCheckout();
  const portal = useBillingPortal();

  const isCreator = billing?.tier === "creator";

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }}
        />
        <div
          className="absolute top-[40%] right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Error banner */}
        {(checkout.isError || portal.isError) && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-8 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200 mb-0.5">Error de pago</p>
              <p className="text-xs text-red-400/80">
                {checkout.error?.message || portal.error?.message || "No se pudo conectar al servicio de pagos. Intenta de nuevo."}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">KORA Studio</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight"
          >
            Más imágenes, más poder
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-base max-w-md mx-auto"
          >
            Plan mensual o tokens según lo que necesites.
          </motion.p>

          {billing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
            >
              <span className="text-zinc-500">Balance actual:</span>
              <span className="font-mono font-bold text-white">{billing.credits} imágenes</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{billing.tier}</span>
            </motion.div>
          )}
        </div>

        {/* ── PLAN ÚNICO ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600">Plan mensual</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div
            className={cn(
              "relative rounded-2xl p-7 border transition-all",
              isCreator
                ? "border-green-500/30 bg-green-500/5"
                : "border-primary/30 bg-primary/5"
            )}
            style={{
              boxShadow: isCreator
                ? "0 0 40px rgba(34,197,94,0.08)"
                : "0 0 40px rgba(168,85,247,0.1)",
            }}
          >
            {isCreator ? (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-green-500 text-[10px] font-bold text-black tracking-widest uppercase">
                  <Check className="w-3 h-3" /> Plan activo
                </span>
              </div>
            ) : (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold text-black tracking-widest uppercase"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                >
                  <Star className="w-2.5 h-2.5" /> Recomendado
                </span>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: price + name */}
              <div>
                <div className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 mb-2 uppercase">{PLAN.label}</div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-5xl font-black text-white font-mono">{PLAN.price}</span>
                  <span className="text-zinc-500 text-sm">{PLAN.period}</span>
                </div>
                <div className="text-zinc-500 text-xs">{PLAN.images} imágenes incluidas</div>
              </div>

              {/* Right: features */}
              <ul className="space-y-2 md:min-w-[220px]">
                {PLAN.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-6">
              {isCreator ? (
                <button
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                >
                  {portal.isPending ? "Cargando..." : "Gestionar suscripción"}
                </button>
              ) : (
                <button
                  onClick={() => checkout.mutate({ type: "subscription", itemId: PLAN.id })}
                  disabled={checkout.isPending}
                  className="w-full py-3.5 rounded-xl text-base font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)",
                    boxShadow: "0 4px 24px rgba(168,85,247,0.35)",
                  }}
                >
                  {checkout.isPending ? "Redirigiendo..." : `Suscribirse por ${PLAN.price}/mes`}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── TOKEN PACKS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600">Tokens extra</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <p className="text-center text-xs text-zinc-600 mb-6">Pago único · sin suscripción · no caducan</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className={cn(
                  "relative glass-panel rounded-2xl p-5 flex flex-col gap-3 border transition-all hover:-translate-y-0.5",
                  pack.best
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-white/[0.06] hover:border-white/20"
                )}
              >
                {pack.best && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-[9px] font-bold text-black tracking-widest uppercase">
                      <Star className="w-2 h-2" /> Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="text-2xl font-black text-white font-mono">{pack.price}</div>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{pack.perImage} / imagen</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-white">{pack.images}</div>
                  <div className="text-zinc-500 text-xs">imágenes</div>
                </div>

                <button
                  onClick={() => checkout.mutate({ type: "pack", itemId: pack.id })}
                  disabled={checkout.isPending}
                  className={cn(
                    "w-full py-2 rounded-xl text-xs font-semibold transition-all",
                    pack.best
                      ? "bg-amber-400 text-black hover:bg-amber-300"
                      : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                  )}
                >
                  {checkout.isPending ? "..." : `Comprar`}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-700"
        >
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Stripe · pago seguro</span>
          <span className="text-zinc-800">·</span>
          <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> Tokens sin caducidad</span>
          <span className="text-zinc-800">·</span>
          <span>Cancela cuando quieras</span>
        </motion.div>

        {/* Manage link */}
        {isCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
            >
              Gestionar o cancelar suscripción
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
