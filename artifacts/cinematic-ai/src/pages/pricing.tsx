import { motion } from "framer-motion";
import { ArrowLeft, Zap, Check, Star, AlertTriangle, ShieldCheck, Infinity, Crown, Sparkles, Package } from "lucide-react";
import { useCheckout, useBillingPortal, useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

const PACKS = [
  {
    id: "pack_20",
    images: 20,
    price: "$1",
    priceCents: 100,
    perImage: "$0.05",
    label: "MICRO",
    gradient: "from-zinc-800 to-zinc-900",
    accent: "text-zinc-300",
    border: "border-white/10",
    glow: "rgba(255,255,255,0.03)",
    tag: null,
  },
  {
    id: "pack_75",
    images: 75,
    price: "$3",
    priceCents: 300,
    perImage: "$0.04",
    label: "POPULAR",
    gradient: "from-amber-950 to-zinc-900",
    accent: "text-amber-300",
    border: "border-amber-500/40",
    glow: "rgba(245,158,11,0.12)",
    tag: "MÁS PEDIDO",
    tagColor: "bg-amber-400 text-black",
    best: true,
  },
  {
    id: "pack_160",
    images: 160,
    price: "$5",
    priceCents: 500,
    perImage: "$0.031",
    label: "ESTUDIO",
    gradient: "from-violet-950 to-zinc-900",
    accent: "text-violet-300",
    border: "border-violet-500/30",
    glow: "rgba(139,92,246,0.12)",
    tag: "MEJOR VALOR",
    tagColor: "bg-violet-500 text-white",
  },
  {
    id: "pack_380",
    images: 380,
    price: "$10",
    priceCents: 1000,
    perImage: "$0.026",
    label: "PRO",
    gradient: "from-pink-950 to-zinc-900",
    accent: "text-pink-300",
    border: "border-pink-500/30",
    glow: "rgba(236,72,153,0.12)",
    tag: "MÁXIMO",
    tagColor: "bg-pink-500 text-white",
  },
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
    "Cancela cuando quieras",
  ],
};

interface PricingPageProps {
  onBack: () => void;
  view: "packs" | "subscription";
}

export function PricingPage({ onBack, view }: PricingPageProps) {
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
          style={{ background: view === "subscription" ? "radial-gradient(circle, #a855f7, transparent)" : "radial-gradient(circle, #f59e0b, transparent)" }}
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

        {/* ════════════════════════════════════════
            VIEW: PACKS
        ════════════════════════════════════════ */}
        {view === "packs" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5"
              >
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">Packs de imágenes</span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                Compra y usa cuando quieras
              </h1>
              <p className="text-zinc-400 text-base max-w-sm mx-auto">
                Pago único. Sin suscripción. Los tokens no caducan nunca.
              </p>

              {billing && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-zinc-500">Balance actual:</span>
                  <span className="font-mono font-bold text-white">{billing.credits} img</span>
                </div>
              )}
            </div>

            {/* Pack cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {PACKS.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  className={cn(
                    "relative rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5",
                    pack.border
                  )}
                  style={{ boxShadow: `0 0 32px ${pack.glow}` }}
                >
                  {/* Gradient background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", pack.gradient)} />

                  {/* Tag */}
                  {pack.tag && (
                    <div className="absolute top-3.5 right-3.5 z-10">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase", pack.tagColor)}>
                        {pack.tag}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10 p-6 flex flex-col gap-5">
                    {/* Label + price row */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={cn("text-[10px] font-mono tracking-[0.25em] mb-1 uppercase", pack.accent)}>{pack.label}</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-white font-mono">{pack.price}</span>
                          <span className="text-zinc-500 text-xs ml-1">pago único</span>
                        </div>
                      </div>
                    </div>

                    {/* Image count */}
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black text-white font-mono leading-none">{pack.images}</span>
                      <div className="pb-1">
                        <div className="text-zinc-300 text-sm font-semibold">imágenes</div>
                        <div className={cn("text-[11px] font-mono", pack.accent)}>{pack.perImage} / imagen</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/[0.07]" />

                    {/* Features */}
                    <ul className="space-y-1.5">
                      {["Sin marca de agua", "Todos los estilos", "Sin caducidad"].map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                          <Check className={cn("w-3 h-3 shrink-0", pack.accent)} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => checkout.mutate({ type: "pack", itemId: pack.id })}
                      disabled={checkout.isPending}
                      className={cn(
                        "w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]",
                        pack.best
                          ? "bg-amber-400 text-black"
                          : "bg-white/10 border border-white/15 text-white hover:bg-white/15"
                      )}
                      style={!pack.best ? {} : { boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}
                    >
                      {checkout.isPending ? "Redirigiendo..." : `Comprar ${pack.images} imágenes`}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust + subscription nudge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-700 mb-8"
            >
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Stripe · pago seguro</span>
              <span className="text-zinc-800">·</span>
              <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> Tokens sin caducidad</span>
              <span className="text-zinc-800">·</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Sin suscripción</span>
            </motion.div>

            {/* Upsell a suscripción */}
            {!isCreator && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center gap-4 text-sm"
              >
                <Crown className="w-8 h-8 text-primary shrink-0" />
                <div className="text-center sm:text-left">
                  <p className="font-bold text-white">¿Usas KORA seguido?</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Con CREATOR por $4.35/mes tienes 120 imágenes mensuales. Sale más barato que cualquier pack.</p>
                </div>
                <button
                  onClick={() => checkout.mutate({ type: "subscription", itemId: PLAN.id })}
                  disabled={checkout.isPending}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                >
                  Ver plan
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            VIEW: SUBSCRIPTION
        ════════════════════════════════════════ */}
        {view === "subscription" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="text-center mb-14">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5"
              >
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary tracking-widest uppercase">Plan Creator</span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                Crea sin límites
              </h1>
              <p className="text-zinc-400 text-base max-w-sm mx-auto">
                120 imágenes cada mes. Sin marca de agua. Cancela cuando quieras.
              </p>

              {billing && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-zinc-500">Balance actual:</span>
                  <span className="font-mono font-bold text-white">{billing.credits} img</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{billing.tier}</span>
                </div>
              )}
            </div>

            {/* Plan card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                "relative rounded-2xl p-8 border mb-8",
                isCreator ? "border-green-500/30 bg-green-500/5" : "border-primary/30 bg-primary/5"
              )}
              style={{
                boxShadow: isCreator ? "0 0 60px rgba(34,197,94,0.08)" : "0 0 60px rgba(168,85,247,0.12)",
              }}
            >
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                {isCreator ? (
                  <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-green-500 text-[10px] font-bold text-black tracking-widest uppercase">
                    <Check className="w-3 h-3" /> Plan activo
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold text-white tracking-widest uppercase"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                  >
                    <Star className="w-2.5 h-2.5" /> Recomendado
                  </span>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                {/* Price */}
                <div>
                  <div className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 mb-3 uppercase">{PLAN.label}</div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-6xl font-black text-white font-mono">{PLAN.price}</span>
                    <span className="text-zinc-500 text-sm">{PLAN.period}</span>
                  </div>
                  <div className="text-zinc-500 text-sm mt-1">{PLAN.images} imágenes incluidas · renueva automáticamente</div>
                </div>

                {/* Features */}
                <ul className="space-y-3 md:min-w-[220px]">
                  {PLAN.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="mt-8">
                {isCreator ? (
                  <button
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
                  >
                    {portal.isPending ? "Cargando..." : "Gestionar suscripción"}
                  </button>
                ) : (
                  <button
                    onClick={() => checkout.mutate({ type: "subscription", itemId: PLAN.id })}
                    disabled={checkout.isPending}
                    className="w-full py-4 rounded-xl text-base font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)",
                      boxShadow: "0 4px 32px rgba(168,85,247,0.4)",
                    }}
                  >
                    {checkout.isPending ? "Redirigiendo..." : `Suscribirse por ${PLAN.price}/mes`}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Trust */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-700"
            >
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Stripe · pago seguro</span>
              <span className="text-zinc-800">·</span>
              <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> Sin permanencia</span>
              <span className="text-zinc-800">·</span>
              <span>Cancela cuando quieras</span>
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
