import { motion } from "framer-motion";
import { Check, ShieldCheck, Infinity, Sparkles, Package, Zap, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const PACKS = [
  {
    id: "pack_10",
    gens: 10,
    price: "$1",
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

const PACK_FEATURES = ["Sin marca de agua", "Todos los estilos", "Sin caducidad"];

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }}
        />
        <div
          className="absolute top-[50%] right-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[100px]"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }}
        />
        <div className="absolute inset-0 bg-background/95" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-14">

        {/* Logo / nav */}
        <div className="flex items-center justify-between mb-14">
          <a href="/" className="flex items-center gap-2 text-white font-black tracking-widest text-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            KORA
          </a>
          <a
            href="/"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 transition-all"
          >
            Empezar gratis →
          </a>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">Precios</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Simple y transparente
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto mb-6">
            Paga solo lo que usas. Sin suscripción. Sin compromisos.
          </p>

          {/* Free hook hero */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-500/10 border border-green-500/20">
            <Gift className="w-4 h-4 text-green-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-bold text-green-300">Empieza gratis — 5 generaciones incluidas</p>
              <p className="text-xs text-green-600">No necesitas tarjeta de crédito</p>
            </div>
          </div>
        </motion.div>

        {/* ── PACKS ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-mono tracking-[0.25em] text-zinc-500 uppercase">Packs de créditos</h2>
            </div>
            <span className="text-xs text-zinc-600 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              1 generación = 1 foto con IA
            </span>
          </div>
          <p className="text-center text-zinc-500 text-sm mb-7">
            Pago único · los créditos no caducan nunca
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
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
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={cn("text-[10px] font-mono tracking-[0.25em] mb-1 uppercase", pack.accent)}>{pack.label}</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white font-mono">{pack.price}</span>
                        <span className="text-zinc-500 text-xs ml-1">pago único</span>
                      </div>
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
                    {PACK_FEATURES.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <Check className={cn("w-3 h-3 shrink-0", pack.accent)} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/"
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold tracking-wide text-center transition-all hover:opacity-90 active:scale-[0.98]",
                      pack.best
                        ? "bg-amber-400 text-black"
                        : "bg-white/10 border border-white/15 text-white hover:bg-white/15"
                    )}
                    style={pack.best ? { boxShadow: "0 4px 16px rgba(245,158,11,0.3)" } : {}}
                  >
                    Obtener {pack.gens} generaciones
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600 mb-10"
        >
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Stripe · pago seguro</span>
          <span className="text-zinc-800">·</span>
          <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> Créditos sin caducidad</span>
          <span className="text-zinc-800">·</span>
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Sin permanencia</span>
        </motion.div>

        {/* Free tier note */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="p-6 rounded-2xl border border-green-500/20 bg-green-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-0.5">Empieza gratis, sin tarjeta</p>
              <p className="text-zinc-500 text-xs">5 generaciones gratuitas al crear tu cuenta · Con marca de agua · Sin compromisos</p>
            </div>
            <a
              href="/"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-zinc-300 hover:bg-white/15 transition-all font-semibold"
            >
              Empezar →
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
