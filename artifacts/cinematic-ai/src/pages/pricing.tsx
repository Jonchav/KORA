import { motion } from "framer-motion";
import { ArrowLeft, Zap, Check, AlertTriangle, ShieldCheck, Infinity, Sparkles, Package, Gift } from "lucide-react";
import { useCheckout, useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

const PACKS = [
  {
    id: "pack_10",
    gens: 10,
    price: "$1",
    priceCents: 100,
    perGen: "$0.10",
    label: "MICRO",
    gradient: "from-zinc-800 to-zinc-900",
    accent: "text-zinc-300",
    border: "border-white/10",
    glow: "rgba(255,255,255,0.03)",
    tag: null,
    tagColor: "",
    best: false,
  },
  {
    id: "pack_30",
    gens: 30,
    price: "$3",
    priceCents: 300,
    perGen: "$0.10",
    label: "POPULAR",
    gradient: "from-amber-950 to-zinc-900",
    accent: "text-amber-300",
    border: "border-amber-500/40",
    glow: "rgba(245,158,11,0.12)",
    tag: "MÁS POPULAR",
    tagColor: "bg-amber-400 text-black",
    best: true,
  },
  {
    id: "pack_60",
    gens: 60,
    price: "$5",
    priceCents: 500,
    perGen: "$0.083",
    label: "ESTUDIO",
    gradient: "from-violet-950 to-zinc-900",
    accent: "text-violet-300",
    border: "border-violet-500/30",
    glow: "rgba(139,92,246,0.12)",
    tag: "RECOMENDADO",
    tagColor: "bg-violet-500 text-white",
    best: false,
  },
  {
    id: "pack_120",
    gens: 120,
    price: "$10",
    priceCents: 1000,
    perGen: "$0.083",
    label: "PRO",
    gradient: "from-pink-950 to-zinc-900",
    accent: "text-pink-300",
    border: "border-pink-500/30",
    glow: "rgba(236,72,153,0.12)",
    tag: "MÁXIMO",
    tagColor: "bg-pink-500 text-white",
    best: false,
  },
];

interface PricingPageProps {
  onBack: () => void;
}

export function PricingPage({ onBack }: PricingPageProps) {
  const { data: billing } = useBilling();
  const checkout = useCheckout();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }}
        />
        <div
          className="absolute top-[40%] right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {checkout.isError && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-8 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200 mb-0.5">Error de pago</p>
              <p className="text-xs text-red-400/80">
                {checkout.error?.message || "No se pudo conectar al servicio de pagos. Intenta de nuevo."}
              </p>
            </div>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">Packs de créditos</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Compra y usa cuando quieras
            </h1>
            <p className="text-zinc-400 text-base max-w-sm mx-auto mb-4">
              Pago único. Sin suscripción. Los créditos no caducan nunca.
            </p>

            {/* Explicación simple */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              1 generación = 1 foto transformada con IA
            </div>

            {billing && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-500">Balance actual:</span>
                <span className="font-mono font-bold text-white">{billing.credits} créditos</span>
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
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", pack.gradient)} />

                {pack.tag && (
                  <div className="absolute top-3.5 right-3.5 z-10">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase", pack.tagColor)}>
                      {pack.tag}
                    </span>
                  </div>
                )}

                <div className="relative z-10 p-6 flex flex-col gap-5">
                  <div>
                    <div className={cn("text-[10px] font-mono tracking-[0.25em] mb-1 uppercase", pack.accent)}>{pack.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white font-mono">{pack.price}</span>
                      <span className="text-zinc-500 text-xs ml-1">pago único</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-white font-mono leading-none">{pack.gens}</span>
                    <div className="pb-1">
                      <div className="text-zinc-300 text-sm font-semibold">generaciones</div>
                      <div className={cn("text-[11px] font-mono", pack.accent)}>{pack.perGen} / generación</div>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.07]" />

                  <ul className="space-y-1.5">
                    {["Sin marca de agua", "Todos los estilos", "Sin caducidad"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <Check className={cn("w-3 h-3 shrink-0", pack.accent)} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => checkout.mutate({ type: "pack", itemId: pack.id })}
                    disabled={checkout.isPending}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]",
                      pack.best
                        ? "bg-amber-400 text-black"
                        : "bg-white/10 border border-white/15 text-white hover:bg-white/15"
                    )}
                    style={pack.best ? { boxShadow: "0 4px 16px rgba(245,158,11,0.3)" } : {}}
                  >
                    {checkout.isPending ? "Redirigiendo..." : `Obtener ${pack.gens} generaciones`}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Free tier hook */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-8"
          >
            <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Empieza gratis</p>
              <p className="text-xs text-zinc-500">2 generaciones gratis al registrarte · No necesitas tarjeta</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-700"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Stripe · pago seguro</span>
            <span className="text-zinc-800">·</span>
            <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> Créditos sin caducidad</span>
            <span className="text-zinc-800">·</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Sin suscripción</span>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
