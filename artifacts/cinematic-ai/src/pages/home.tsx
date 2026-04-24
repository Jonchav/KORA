import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import { StyleCard, STYLES } from "@/components/style-card";
import type { StyleConfig } from "@/components/style-card";
import { FormatSelector } from "@/components/format-selector";
import { useTransformMutation, useJobPolling, API_BASE } from "@/hooks/use-transform";
import type { StyleType, FormatType } from "@/hooks/use-transform";
import { useAuth } from "@/contexts/auth-context";
import { useBilling, useInvalidateBilling } from "@/hooks/use-billing";
import { PricingPage } from "@/pages/pricing";
import { GalleryPage } from "@/pages/gallery";
import {
  Loader2, Download, RotateCcw, AlertTriangle,
  Sparkles, ImageIcon, Zap, Upload, Palette, LogOut, ShoppingBag, Plus, Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Authenticated image viewer (avoids sending auth header via <img> src) ─────
function ResultImage({ jobId, alt }: { jobId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    const token = localStorage.getItem("kora_auth_token");
    fetch(`${API_BASE}/api/transform/${jobId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (!r.ok) throw new Error("not ok"); return r.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [jobId]);

  if (failed) return (
    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
      No se pudo cargar la imagen
    </div>
  );
  if (!src) return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
    </div>
  );
  return <img src={src} alt={alt} className="w-full h-full object-contain" />;
}

// ── Preview card for the scrolling gallery ────────────────────────────────────
const CARD_PATTERNS: Record<StyleType, string> = {
  comic:      "repeating-radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0) 0 0 / 10px 10px",
  anime:      "radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
  popart:     "repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 2px, transparent 2px, transparent 10px)",
  watercolor: "radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
  oilpainting:"repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)",
  cyberpunk:  "repeating-linear-gradient(0deg, rgba(0,255,255,0.06) 0px, rgba(0,255,255,0.06) 1px, transparent 1px, transparent 4px)",
  pixel:      "repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(0,0,0,0.12) 7px, rgba(0,0,0,0.12) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(0,0,0,0.12) 7px, rgba(0,0,0,0.12) 8px)",
  clay:       "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.18) 0%, transparent 60%)",
  toy:        "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 50%)",
  vaporwave:  "repeating-linear-gradient(0deg, rgba(255,0,255,0.05) 0px, rgba(255,0,255,0.05) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, rgba(0,255,255,0.04) 0px, rgba(0,255,255,0.04) 1px, transparent 1px, transparent 24px)",
  fantasy:    "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 60%)",
  gtasa:      "repeating-linear-gradient(45deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 2px, transparent 2px, transparent 12px)",
  dccomic:     "repeating-radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1.5px, transparent 0) 0 0 / 8px 8px, linear-gradient(180deg, rgba(251,191,36,0.08) 0%, transparent 60%)",
  fortnite:    "repeating-linear-gradient(60deg, rgba(99,102,241,0.08) 0px, rgba(99,102,241,0.08) 1px, transparent 1px, transparent 14px)",
  luxury:      "radial-gradient(ellipse at 50% 20%, rgba(202,138,4,0.12) 0%, transparent 60%)",
  hollywood:   "repeating-linear-gradient(45deg, rgba(245,158,11,0.06) 0px, rgba(245,158,11,0.06) 1px, transparent 1px, transparent 10px)",
  sims:        "repeating-linear-gradient(0deg, rgba(52,211,153,0.06) 0px, rgba(52,211,153,0.06) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(90deg, rgba(52,211,153,0.04) 0px, rgba(52,211,153,0.04) 1px, transparent 1px, transparent 8px)",
  timetraveler:"radial-gradient(ellipse at 30% 70%, rgba(180,83,9,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(120,113,108,0.1) 0%, transparent 40%)",
  matrix:      "repeating-linear-gradient(0deg, rgba(0,255,70,0.07) 0px, rgba(0,255,70,0.07) 1px, transparent 1px, transparent 8px)",
  titanic:     "radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 50% 20%, rgba(251,191,36,0.1) 0%, transparent 50%)",
  starwars:    "radial-gradient(ellipse at 70% 30%, rgba(251,191,36,0.12) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.08) 0%, transparent 40%)",
  godfather:   "linear-gradient(160deg, rgba(180,83,9,0.12) 0%, rgba(0,0,0,0) 60%)",
  madmax:      "repeating-linear-gradient(45deg, rgba(234,88,12,0.06) 0px, rgba(234,88,12,0.06) 1px, transparent 1px, transparent 12px)",
  interstellar:"radial-gradient(ellipse at 60% 40%, rgba(251,191,36,0.12) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(14,165,233,0.08) 0%, transparent 40%)",
  gatsby:      "radial-gradient(ellipse at 50% 30%, rgba(202,138,4,0.15) 0%, transparent 60%)",
  wonderwoman: "repeating-linear-gradient(135deg, rgba(220,38,38,0.05) 0px, rgba(220,38,38,0.05) 1px, transparent 1px, transparent 10px)",
};

const CARD_DECORATIONS: Record<StyleType, React.ReactNode> = {
  comic: (
    <>
      <div className="absolute top-3 left-3 text-[10px] font-black text-black/30 tracking-widest uppercase">POW!</div>
      <div className="absolute bottom-3 right-3 text-[9px] font-black text-black/20 tracking-widest">ZAP</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-4 border-black/10" />
    </>
  ),
  anime: (
    <>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute text-white/20 text-xs select-none"
          style={{ top: `${10 + i * 11}%`, left: `${5 + (i % 3) * 35}%` }}>✦</div>
      ))}
    </>
  ),
  popart: (
    <>
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-yellow-300/30 border-2 border-yellow-300/50" />
      <div className="absolute bottom-4 left-4 w-5 h-5 rounded-full bg-blue-400/30 border-2 border-blue-400/50" />
      <div className="absolute top-1/2 right-6 w-3 h-3 rounded-full bg-white/30" />
    </>
  ),
  watercolor: (
    <>
      <div className="absolute inset-0 rounded-2xl opacity-30"
        style={{ background: "radial-gradient(ellipse 80% 60% at 40% 60%, rgba(255,255,255,0.3) 0%, transparent 70%)" }} />
    </>
  ),
  oilpainting: (
    <>
      <div className="absolute top-4 right-4 w-12 h-1 bg-white/15 rounded" />
      <div className="absolute top-7 right-4 w-8 h-1 bg-white/10 rounded" />
      <div className="absolute top-10 right-4 w-10 h-1 bg-white/12 rounded" />
    </>
  ),
  cyberpunk: (
    <>
      <div className="absolute top-3 left-3 text-[9px] font-mono text-cyan-300/40">SYS_AI</div>
      <div className="absolute bottom-3 right-3 text-[9px] font-mono text-purple-300/40">v2.0</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
    </>
  ),
  pixel: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-green-300/50 tracking-widest">PLAYER 1</div>
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-green-400/40">► START</div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="absolute w-2 h-2 bg-green-400/20"
          style={{ top: `${15 + i * 17}%`, right: `${8 + (i % 2) * 10}%` }} />
      ))}
    </>
  ),
  clay: (
    <>
      <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-orange-200/20 border-2 border-orange-200/30" />
      <div className="absolute bottom-5 left-3 w-6 h-6 rounded-full bg-rose-300/20 border border-rose-300/30" />
    </>
  ),
  toy: (
    <>
      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white/40" />
      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-white/30" />
      <div className="absolute bottom-3 left-3 text-[8px] font-black text-white/20 tracking-widest uppercase">COLLECT</div>
    </>
  ),
  vaporwave: (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20"
        style={{ background: "linear-gradient(to top, rgba(255,0,255,0.4), transparent)" }} />
      <div className="absolute top-3 left-3 text-[9px] font-mono text-fuchsia-300/50">A E S T H E T I C</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-fuchsia-400/20" />
    </>
  ),
  fantasy: (
    <>
      <div className="absolute top-3 left-3 text-white/20 text-sm">⚔️</div>
      <div className="absolute top-3 right-3 text-white/20 text-sm">🐉</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-purple-400/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]" />
    </>
  ),
  gtasa: (
    <>
      <div className="absolute top-2 left-2 text-[10px] font-black text-green-300/60 tracking-widest">GROVE ST</div>
      <div className="absolute bottom-2 right-2 text-[9px] font-black text-green-400/50">GSF</div>
      <div className="absolute top-3 right-3 text-white/20 text-sm">🔫</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-green-500/20" />
    </>
  ),
  dccomic: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-black text-yellow-900/60 tracking-widest uppercase">DC Comics</div>
      <div className="absolute bottom-2 right-2 text-yellow-900/30 text-base">🦇</div>
      <div className="absolute top-3 right-3 text-[8px] font-black text-yellow-900/30 tracking-widest">1950s</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-yellow-700/20" />
    </>
  ),
  fortnite: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-indigo-300/60 tracking-widest">BATTLE ROYALE</div>
      <div className="absolute bottom-2 right-2 text-base text-indigo-300/30">🎯</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-indigo-400/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]" />
    </>
  ),
  luxury: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-yellow-600/50 tracking-widest uppercase">VIP</div>
      <div className="absolute bottom-2 right-2 text-base text-yellow-600/30">💎</div>
      <div className="absolute top-3 right-3 text-[8px] font-mono text-yellow-600/30">EXCLUSIVE</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-yellow-600/15" />
    </>
  ),
  hollywood: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-black text-amber-400/50 tracking-widest">★ STAR ★</div>
      <div className="absolute bottom-2 right-2 text-base text-amber-400/30">🎬</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-amber-400/15 shadow-[0_0_20px_rgba(251,191,36,0.1)]" />
    </>
  ),
  sims: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-bold text-green-300/60 tracking-widest uppercase">THE SIMS</div>
      <div className="absolute bottom-2 right-2 text-base text-green-300/30">🏠</div>
      <div className="absolute top-3 right-3 text-green-300/40 text-xs">◆</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-green-400/20" />
    </>
  ),
  timetraveler: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-amber-700/60 tracking-widest">1888 → ∞</div>
      <div className="absolute bottom-2 right-2 text-base text-amber-700/30">⏱️</div>
      <div className="absolute top-3 right-3 text-[8px] font-mono text-amber-700/40">⚙</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-amber-700/20" />
    </>
  ),
  matrix: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-green-400/60 tracking-widest">THE MATRIX</div>
      <div className="absolute bottom-2 right-2 text-base text-green-400/30">💊</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-green-400/20 shadow-[0_0_20px_rgba(74,222,128,0.1)]" />
    </>
  ),
  titanic: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-blue-300/60 tracking-widest">TITANIC</div>
      <div className="absolute bottom-2 right-2 text-base text-blue-300/30">🚢</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-blue-400/20" />
    </>
  ),
  starwars: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-yellow-300/60 tracking-widest">STAR WARS</div>
      <div className="absolute bottom-2 right-2 text-base text-yellow-300/30">⚔️</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.1)]" />
    </>
  ),
  godfather: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-amber-700/60 tracking-widest">THE GODFATHER</div>
      <div className="absolute bottom-2 right-2 text-base text-amber-700/30">🌹</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-amber-800/20" />
    </>
  ),
  madmax: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-orange-400/60 tracking-widest">MAD MAX</div>
      <div className="absolute bottom-2 right-2 text-base text-orange-400/30">💀</div>
      <div className="absolute top-3 right-3 text-[8px] font-mono text-orange-400/40">FURY ROAD</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-orange-500/20" />
    </>
  ),
  interstellar: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-sky-300/60 tracking-widest">INTERSTELLAR</div>
      <div className="absolute bottom-2 right-2 text-base text-sky-300/30">🪐</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-sky-400/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]" />
    </>
  ),
  gatsby: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-yellow-500/60 tracking-widest">GREAT GATSBY</div>
      <div className="absolute bottom-2 right-2 text-base text-yellow-500/30">🥂</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]" />
    </>
  ),
  wonderwoman: (
    <>
      <div className="absolute top-2 left-2 text-[9px] font-mono text-red-400/60 tracking-widest">WONDER WOMAN</div>
      <div className="absolute bottom-2 right-2 text-base text-red-400/30">🦅</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-red-500/20 shadow-[0_0_20px_rgba(248,113,113,0.1)]" />
    </>
  ),
};

function PreviewCard({ s, imgSrc }: { s: StyleConfig; index: number; imgSrc: string }) {
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <div className="relative shrink-0 w-48 h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Gradient base — always visible as fallback */}
      <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-75`} />
      <div className="absolute inset-0" style={{ backgroundImage: CARD_PATTERNS[s.id] }} />
      {CARD_DECORATIONS[s.id]}

      {/* Image — eagerly loaded, never lazy-unloaded */}
      {imgOk && (
        <img
          src={imgSrc}
          alt={s.label}
          loading="eager"
          fetchPriority="high"
          onError={() => setImgOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

      {/* Labels */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-3">
        <div className="self-end">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-black/50 backdrop-blur-sm border border-white/20 text-white/90">
            ✦ Real Result
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-sm tracking-widest uppercase drop-shadow-lg">
            {s.label}
          </p>
          <p className="text-white/60 text-[10px] mt-0.5 leading-tight">{s.description}</p>
        </div>
      </div>
    </div>
  );
}

// Single carousel — 9 diverse results, no original selfie
type GalleryItem = StyleConfig & { imgSrc: string };

const s = (id: StyleType) => STYLES.find(st => st.id === id)!;

const CAROUSEL_ITEMS: GalleryItem[] = [
  { ...s("gtasa"),       imgSrc: "/examples/man-gtasa.jpg" },
  { ...s("sims"),        imgSrc: "/examples/man-sims.jpg" },
  { ...s("luxury"),      imgSrc: "/examples/man-luxury.jpg" },
  { ...s("fortnite"),      imgSrc: "/examples/girl-fortnite.jpg" },
  { ...s("timetraveler"), imgSrc: "/examples/man-timetraveler.jpg" },
  { ...s("hollywood"),    imgSrc: "/examples/man-hollywood.jpg" },
  { ...s("dccomic"),      imgSrc: "/examples/selfie-dccomic.jpg" },
  { ...s("anime"),       imgSrc: "/examples/anime-v2.jpg" },
  { ...s("clay"),        imgSrc: "/examples/girl-clay.jpg" },
  { ...s("comic"),       imgSrc: "/examples/comic-v2.jpg" },
  { ...s("vaporwave"),   imgSrc: "/examples/denim-vapor.jpg" },
  { ...s("popart"),      imgSrc: "/examples/popart-v2.jpg" },
  { ...s("pixel"),       imgSrc: "/examples/cafe-pixel.jpg" },
  { ...s("watercolor"),  imgSrc: "/examples/watercolor-v2.jpg" },
  { ...s("gtasa"),       imgSrc: "/examples/man-gtasa.jpg" },
  { ...s("fantasy"),     imgSrc: "/examples/flower-fantasy.jpg" },
  { ...s("oilpainting"), imgSrc: "/examples/oilpainting-v2.jpg" },
  { ...s("toy"),         imgSrc: "/examples/red-toy.jpg" },
  { ...s("cyberpunk"),   imgSrc: "/examples/cyberpunk-v2.jpg" },
  { ...s("anime"),       imgSrc: "/examples/park-anime.jpg" },
  { ...s("dccomic"),     imgSrc: "/examples/selfie-dccomic.jpg" },
  { ...s("cyberpunk"),   imgSrc: "/examples/man-cyber.jpg" },
  { ...s("anime"),       imgSrc: "/examples/field-anime.jpg" },
  { ...s("oilpainting"), imgSrc: "/examples/mountain-oil.jpg" },
  { ...s("comic"),       imgSrc: "/examples/fiat-comic.jpg" },
];

// Duplicate for seamless infinite scroll
const CAROUSEL = [...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS];

const CARD_W    = 192 + 16; // w-48 + gap-4
const SPEED     = 0.55;     // px per frame
const NUDGE_PX  = CARD_W * 3;

function GalleryStrip() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const posRef     = useRef(0);
  const halfWRef   = useRef(0);
  const rafRef     = useRef<number>(0);
  const nudgingRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    halfWRef.current = el.scrollWidth / 2;

    const tick = () => {
      if (!nudgingRef.current) {
        posRef.current -= SPEED;
        if (posRef.current <= -halfWRef.current) posRef.current += halfWRef.current;
        el.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const nudge = (dir: -1 | 1) => {
    if (nudgingRef.current) return; // ignore while animating
    const hw  = halfWRef.current;
    const el  = trackRef.current;
    if (!hw || !el) return;

    nudgingRef.current = true;

    let next = posRef.current + dir * NUDGE_PX;
    while (next > 0)    next -= hw;
    while (next <= -hw) next += hw;
    posRef.current = next;

    // Animate the jump with CSS transition; rAF is paused during this
    el.style.transition = "transform 0.38s cubic-bezier(0.4,0,0.2,1)";
    el.style.transform  = `translateX(${next}px)`;

    setTimeout(() => {
      if (trackRef.current) {
        trackRef.current.style.transition = "none";
      }
      nudgingRef.current = false;
    }, 420);
  };

  return (
    <div className="relative w-full overflow-hidden py-4 select-none">
      <div
        ref={trackRef}
        className="flex gap-4"
        style={{ width: "max-content", willChange: "transform" }}
      >
        {CAROUSEL.map((item, i) => <PreviewCard key={`c-${i}`} s={item} index={i} imgSrc={item.imgSrc} />)}
      </div>

      {/* Edge fade masks */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Arrow buttons */}
      <button
        onClick={() => nudge(1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all text-lg leading-none"
        aria-label="Previous"
      >‹</button>
      <button
        onClick={() => nudge(-1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all text-lg leading-none"
        aria-label="Next"
      >›</button>
    </div>
  );
}

// ── How it works bar ──────────────────────────────────────────────────────────
const STEPS = [
  { icon: Upload,  label: "Upload",    desc: "A photo with your face visible" },
  { icon: Palette, label: "Style",     desc: "Pick from 12 AI styles" },
  { icon: Sparkles,label: "Transform", desc: "AI runs in ~60 seconds"  },
  { icon: Download,label: "Download",  desc: "HD quality, ready to post" },
];

function HowItWorks() {
  return (
    <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06] my-8">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.08 }}
          className="relative bg-[#0d0d0d] px-5 py-5 flex flex-col gap-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-700">
              {String(i + 1).padStart(2, "0")}
            </span>
            <step.icon className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-wide">{step.label}</p>
            <p className="text-zinc-600 text-[11px] mt-0.5 leading-snug">{step.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<StyleType>("comic");
  const [format, setFormat] = useState<FormatType>("square");
  const [transformJobId, setTransformJobId] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [noCreditsError, setNoCreditsError] = useState(false);
  const [styleTab, setStyleTab] = useState<"ai" | "movie">("ai");

  const { user, logout } = useAuth();
  const transformMutation = useTransformMutation();
  const { data: transformStatus } = useJobPolling(transformJobId);
  const { data: billing } = useBilling();
  const invalidateBilling = useInvalidateBilling();

  // Detect payment success from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      invalidateBilling();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [invalidateBilling]);

  const isTransforming = transformMutation.isPending ||
    (!!transformJobId && transformStatus?.status !== "completed" && transformStatus?.status !== "failed");
  const transformDone = transformStatus?.status === "completed";

  const handleTransform = async () => {
    if (!file) return;
    setTransformJobId(null);
    setNoCreditsError(false);
    transformMutation.reset();
    try {
      const result = await transformMutation.mutateAsync({ image: file, style, format });
      setTransformJobId(result.jobId);
      invalidateBilling();
    } catch (e: any) {
      if (e?.message?.includes("No credits")) {
        setNoCreditsError(true);
      }
      console.error(e);
    }
  };

  const handleDownload = async (jobId: string, label: string) => {
    try {
      const token = localStorage.getItem("kora_auth_token");
      const response = await fetch(`${API_BASE}/api/transform/${jobId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Download error:", e);
      alert("Download failed. Please try again.");
    }
  };

  const resetTransform = () => {
    setFile(null); setTransformJobId(null); transformMutation.reset(); setNoCreditsError(false);
  };

  const handleFileSelect = (f: File | null) => {
    setFile(f);
  };

  const currentStyle = STYLES.find(s => s.id === style)!;

  if (showPricing) {
    return <PricingPage onBack={() => setShowPricing(false)} />;
  }

  if (showGallery) {
    return <GalleryPage onBack={() => setShowGallery(false)} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute -top-40 right-0 w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute top-[60%] left-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[60px]"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute inset-0 bg-background/85" />
      </div>

      <div className="relative z-10">

        {/* ── Top bar ── */}
        <div className="max-w-4xl mx-auto px-1 pt-2 flex justify-between items-center">
          {/* Left: brand mark */}
          <img
            src="/kora-logo.png"
            alt="KORA"
            className="h-16 w-16 object-contain"
            style={{ filter: 'drop-shadow(0 0 10px #6699ff88)' }}
          />

          {/* Right: PRO button + credits + user */}
          {user && (
            <div className="flex items-center gap-2">

              {/* Token counter + buy button */}
              {billing && (
                <div
                  className={cn(
                    "flex items-center rounded-lg border overflow-hidden text-xs transition-colors",
                    billing.credits <= 2
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-white/10 bg-white/5"
                  )}
                >
                  {/* Counter area */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <Zap className={cn("w-3 h-3 shrink-0", billing.credits <= 2 ? "text-amber-400" : "text-primary")} />
                    <span className="font-mono font-bold text-white tabular-nums">{billing.credits}</span>
                    <span className={cn("text-[10px] font-medium hidden sm:inline", billing.credits <= 2 ? "text-amber-500" : "text-zinc-600")}>
                      {billing.credits <= 2 ? "bajo" : "créd"}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className={cn("w-px self-stretch", billing.credits <= 2 ? "bg-amber-500/30" : "bg-white/10")} />

                  {/* + Buy button */}
                  <button
                    onClick={() => setShowPricing(true)}
                    title="Comprar más créditos"
                    className={cn(
                      "flex items-center justify-center w-7 h-full transition-colors",
                      billing.credits <= 2
                        ? "text-amber-400 hover:bg-amber-500/20"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-white/10" />
              )}
              <button
                onClick={() => setShowGallery(true)}
                title="Mi galería"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <Images className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden">

          {/* Background showcase images */}
          <div className="absolute inset-0 pointer-events-none select-none flex justify-between items-start px-0" aria-hidden="true">
            {/* Left — GTA */}
            <img
              src="/examples/man-gtasa.jpg"
              className="w-[22vw] max-w-[240px] h-[110%] object-cover object-top opacity-[0.13] rounded-tr-3xl rounded-br-3xl"
              draggable={false}
            />
            {/* Center — Sims */}
            <img
              src="/examples/man-sims.jpg"
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[18vw] max-w-[200px] h-full object-cover object-top opacity-[0.07]"
              draggable={false}
            />
            {/* Right — Fortnite */}
            <img
              src="/examples/girl-fortnite.jpg"
              className="w-[22vw] max-w-[240px] h-[110%] object-cover object-top opacity-[0.13] rounded-tl-3xl rounded-bl-3xl"
              draggable={false}
            />
          </div>

          {/* Top + bottom fade to blend edges */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

        <div className="max-w-4xl mx-auto px-4 pt-8 sm:pt-12 text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">KORA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-5 leading-[0.95] tracking-tight"
          >
            <span className="text-shimmer">Transform</span>
            <br />
            <span className="text-white">Your Photos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-zinc-400 text-lg max-w-lg mx-auto mb-2"
          >
            Upload a photo with your face. Pick a style. Get a <span className="text-white font-semibold">studio-quality</span> AI portrait in seconds — your face, perfectly preserved.
          </motion.p>

        </div>
        </div>{/* end hero wrapper */}

        {/* ── Scrolling gallery ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <GalleryStrip />
        </motion.div>

        {/* ── How it works + Transformer ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">

          <HowItWorks />

          {/* Divider */}
          <div className="flex items-center gap-5 mb-8">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600">Begin</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Transformer grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Controls */}
            <div className="lg:col-span-5 space-y-4">

              {!transformDone && (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="glass-panel rounded-2xl p-4"
                >
                  <h3 className="text-xs font-mono text-zinc-600 mb-3 flex items-center gap-3 tracking-widest uppercase">
                    <span>01</span>
                    <span className="flex-1 h-px bg-white/[0.05]" />
                    Upload Your Photo
                  </h3>
                  <UploadZone onFileSelect={handleFileSelect} selectedFile={file} disabled={isTransforming} />

                  {/* ── Photo tips ── */}
                  {file && (
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-300">¿Tu foto tiene un rostro visible?</p>
                          <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
                            Para mejores resultados usa una selfie o foto donde tu cara esté centrada y bien iluminada.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-zinc-700/50 bg-zinc-800/40">
                        <span className="text-base shrink-0 mt-0.5">💡</span>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Funciona mejor con una sola persona en la foto.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}


              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-panel rounded-2xl overflow-hidden"
              >
                {/* Tab header */}
                <div className="flex border-b border-white/[0.06]">
                  <button
                    onClick={() => setStyleTab("ai")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-widest uppercase transition-all",
                      styleTab === "ai"
                        ? "text-white border-b-2 border-primary bg-white/[0.03]"
                        : "text-zinc-600 hover:text-zinc-400"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Estilos AI
                  </button>
                  <div className="w-px bg-white/[0.06]" />
                  <button
                    onClick={() => setStyleTab("movie")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-widest uppercase transition-all",
                      styleTab === "movie"
                        ? "text-white border-b-2 border-amber-500 bg-white/[0.03]"
                        : "text-zinc-600 hover:text-zinc-400"
                    )}
                  >
                    <span className="text-sm leading-none">🎬</span>
                    Escenas de Película
                  </button>
                </div>

                {/* Tab body */}
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {styleTab === "ai" ? (
                      <motion.div
                        key="ai"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {STYLES.filter(s => !s.isMovie).map((s, i) => (
                          <StyleCard key={s.id} config={s} selected={style === s.id} onClick={setStyle} disabled={isTransforming} index={i} />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="movie"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {STYLES.filter(s => s.isMovie).map((s, i) => (
                          <StyleCard key={s.id} config={s} selected={style === s.id} onClick={setStyle} disabled={isTransforming} index={i} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-panel rounded-2xl p-4"
              >
                <h3 className="text-xs font-mono text-zinc-600 mb-3 flex items-center gap-3 tracking-widest uppercase">
                  <span>03</span>
                  <span className="flex-1 h-px bg-white/[0.05]" />
                  Output Format
                </h3>
                <FormatSelector value={format} onChange={setFormat} disabled={isTransforming} />
              </motion.div>

              {noCreditsError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center"
                >
                  <p className="text-amber-300 text-sm font-semibold mb-1">Sin créditos disponibles</p>
                  <p className="text-zinc-400 text-xs mb-3">Compra un pack para seguir generando.</p>
                  <button
                    onClick={() => setShowPricing(true)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Obtener más generaciones
                  </button>
                </motion.div>
              )}

              {!transformDone ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  onClick={handleTransform}
                  disabled={!file || isTransforming || noCreditsError}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5",
                    file && !isTransforming && !noCreditsError
                      ? `bg-gradient-to-r ${currentStyle.gradient} text-white shadow-2xl hover:-translate-y-1 hover:shadow-3xl active:translate-y-0`
                      : "bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  )}
                  style={file && !isTransforming && !noCreditsError ? { boxShadow: `0 8px 40px -8px ${currentStyle.glow}` } : {}}
                >
                  {isTransforming
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Transforming...</>
                    : <><Sparkles className="w-5 h-5" /> Transform to {currentStyle.label}</>
                  }
                </motion.button>
              ) : (
                <button
                  onClick={resetTransform}
                  className="w-full py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4" /> Transform another photo
                </button>
              )}
            </div>

            {/* Right: Result */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
              className="lg:col-span-7"
            >
              <div className="glass-panel rounded-2xl overflow-hidden h-full min-h-[480px] flex flex-col">
                <AnimatePresence mode="wait">

                  {transformDone && transformJobId ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="relative flex-1 min-h-[400px]">
                        <ResultImage jobId={transformJobId} alt={`${style} transformation`} />
                        {/* Success badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs font-semibold text-white">AI Enhanced HD</span>
                        </div>
                      </div>
                      <div className="p-4 border-t border-white/5">
                        <button
                          onClick={() => handleDownload(transformJobId, `kora-${style}`)}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-black bg-white hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download HD Image
                        </button>
                      </div>
                    </motion.div>

                  ) : isTransforming ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 blur-3xl rounded-full opacity-20 animate-pulse-glow bg-white/10" />
                        <div className="w-20 h-20 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center relative animate-float">
                          <Loader2 className="w-9 h-9 text-white/60 animate-spin" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black text-white mb-1 tracking-wide">Creating {currentStyle.label}</h3>
                        <p className="text-sm text-zinc-400">AI is enhancing your photo in HD. Usually 45–75 seconds.</p>
                      </div>
                      <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white/40 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "92%" }}
                          transition={{ duration: 55, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600">Style transfer · AI enhancement · HD upscale</p>
                    </motion.div>

                  ) : transformStatus?.status === "failed" ? (
                    <motion.div key="error" className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                      <AlertTriangle className="w-12 h-12 text-red-400" />
                      <h3 className="text-base font-bold text-red-300">Transformation Failed</h3>
                      <p className="text-sm text-zinc-400 text-center max-w-xs">{transformStatus.error || "An unexpected error occurred."}</p>
                      <button onClick={resetTransform} className="mt-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition">
                        Try again
                      </button>
                    </motion.div>

                  ) : transformMutation.isError ? (
                    <motion.div key="error-mut" className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                      <AlertTriangle className="w-12 h-12 text-red-400" />
                      <p className="text-sm text-zinc-400 text-center">{transformMutation.error?.message}</p>
                      <button onClick={resetTransform} className="mt-1 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300">Try again</button>
                    </motion.div>

                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center"
                    >
                      {/* Animated style preview ring */}
                      <div className="relative">
                        <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/[0.02]">
                          <ImageIcon className="w-10 h-10 text-zinc-700" />
                        </div>
                        {/* Orbiting style dots */}
                        {STYLES.slice(0,4).map((s, i) => (
                          <div key={s.id}
                            className="absolute w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center animate-float"
                            style={{
                              top: i < 2 ? "-12px" : "auto",
                              bottom: i >= 2 ? "-12px" : "auto",
                              left: i % 2 === 0 ? "-12px" : "auto",
                              right: i % 2 === 1 ? "-12px" : "auto",
                              animationDelay: `${i * 1}s`
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-zinc-300 font-bold text-lg">Your masterpiece awaits</p>
                        <p className="text-zinc-600 text-sm mt-1">Use a photo where your face is clearly visible</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </div>
  );
}
