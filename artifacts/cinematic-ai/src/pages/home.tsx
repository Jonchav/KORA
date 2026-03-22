import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import { StyleCard, STYLES } from "@/components/style-card";
import type { StyleConfig } from "@/components/style-card";
import { FormatSelector } from "@/components/format-selector";
import { useTransformMutation, useJobPolling } from "@/hooks/use-transform";
import type { StyleType, FormatType } from "@/hooks/use-transform";
import {
  Loader2, Download, RotateCcw, AlertTriangle,
  Sparkles, Wand2, ImageIcon, Zap, ArrowRight, Upload, Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
          <p className="text-white font-black text-sm tracking-wide drop-shadow-lg">
            {s.emoji} {s.label}
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
  { ...s("anime"),       imgSrc: "/examples/anime-v2.jpg" },
  { ...s("clay"),        imgSrc: "/examples/girl-clay.jpg" },
  { ...s("comic"),       imgSrc: "/examples/comic-v2.jpg" },
  { ...s("vaporwave"),   imgSrc: "/examples/denim-vapor.jpg" },
  { ...s("popart"),      imgSrc: "/examples/popart-v2.jpg" },
  { ...s("pixel"),       imgSrc: "/examples/cafe-pixel.jpg" },
  { ...s("watercolor"),  imgSrc: "/examples/watercolor-v2.jpg" },
  { ...s("fantasy"),     imgSrc: "/examples/flower-fantasy.jpg" },
  { ...s("oilpainting"), imgSrc: "/examples/oilpainting-v2.jpg" },
  { ...s("toy"),         imgSrc: "/examples/red-toy.jpg" },
  { ...s("cyberpunk"),   imgSrc: "/examples/cyberpunk-v2.jpg" },
  { ...s("anime"),       imgSrc: "/examples/park-anime.jpg" },
  { ...s("cyberpunk"),   imgSrc: "/examples/man-cyber.jpg" },
  { ...s("anime"),       imgSrc: "/examples/field-anime.jpg" },
  { ...s("oilpainting"), imgSrc: "/examples/mountain-oil.jpg" },
  { ...s("comic"),       imgSrc: "/examples/fiat-comic.jpg" },
];

// Duplicate for seamless infinite scroll
const CAROUSEL = [...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS];

function GalleryStrip() {
  return (
    <div className="relative w-full overflow-hidden py-4 select-none pointer-events-none">
      <div className="flex gap-4 animate-marquee-left" style={{ width: "max-content" }}>
        {CAROUSEL.map((item, i) => <PreviewCard key={`c-${i}`} s={item} index={i} imgSrc={item.imgSrc} />)}
      </div>
      {/* Edge fade masks */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  );
}

// ── How it works bar ──────────────────────────────────────────────────────────
const STEPS = [
  { icon: Upload,  label: "Upload",    desc: "Any photo with a face" },
  { icon: Palette, label: "Style",     desc: "Pick from 11 AI styles" },
  { icon: Sparkles,label: "Transform", desc: "AI runs in ~60 seconds"  },
  { icon: Download,label: "Download",  desc: "HD quality, ready to post" },
];

function HowItWorks() {
  return (
    <div className="grid grid-cols-4 gap-3 my-8">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className="relative glass-card rounded-xl p-4 text-center group"
        >
          {i < STEPS.length - 1 && (
            <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-20 hidden sm:block" />
          )}
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <step.icon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-white font-bold text-sm">{step.label}</p>
          <p className="text-zinc-500 text-[11px] mt-0.5">{step.desc}</p>
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

  const transformMutation = useTransformMutation();
  const { data: transformStatus } = useJobPolling(transformJobId);

  const isTransforming = transformMutation.isPending ||
    (!!transformJobId && transformStatus?.status !== "completed" && transformStatus?.status !== "failed");
  const transformDone = transformStatus?.status === "completed";

  const handleTransform = async () => {
    if (!file) return;
    setTransformJobId(null);
    transformMutation.reset();
    try {
      const result = await transformMutation.mutateAsync({ image: file, style, format });
      setTransformJobId(result.jobId);
    } catch (e) { console.error(e); }
  };

  const handleDownload = async (jobId: string, label: string) => {
    try {
      const response = await fetch(`/api/transform/${jobId}/download`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${label}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const resetTransform = () => {
    setFile(null); setTransformJobId(null); transformMutation.reset();
  };

  const currentStyle = STYLES.find(s => s.id === style)!;

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

        {/* ── Hero ── */}
        <div className="max-w-4xl mx-auto px-4 pt-12 sm:pt-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">AI Creative Studio</span>
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
            Upload a selfie. Pick a style. Get a <span className="text-white font-semibold">studio-quality</span> AI portrait in seconds — your face, perfectly preserved.
          </motion.p>

          {/* Style tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-4"
          >
            {STYLES.map(s => (
              <span key={s.id}
                className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${s.gradient} text-white/90 shadow-sm`}>
                {s.emoji} {s.label}
              </span>
            ))}
          </motion.div>
        </div>

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
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/5" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">Your Turn</span>
            </div>
            <div className="flex-1 h-px bg-white/5" />
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
                  <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-black">1</span>
                    Upload Your Photo
                  </h3>
                  <UploadZone onFileSelect={setFile} selectedFile={file} disabled={isTransforming} />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-panel rounded-2xl p-4"
              >
                <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-black">2</span>
                  Choose Your Style
                </h3>
                <div className="space-y-2">
                  {STYLES.map(s => (
                    <StyleCard key={s.id} config={s} selected={style === s.id} onClick={setStyle} disabled={isTransforming} />
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-panel rounded-2xl p-4"
              >
                <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-black">3</span>
                  Output Format
                </h3>
                <FormatSelector value={format} onChange={setFormat} disabled={isTransforming} />
              </motion.div>

              {!transformDone ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  onClick={handleTransform}
                  disabled={!file || isTransforming}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5",
                    file && !isTransforming
                      ? `bg-gradient-to-r ${currentStyle.gradient} text-white shadow-2xl hover:-translate-y-1 hover:shadow-3xl active:translate-y-0`
                      : "bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  )}
                  style={file && !isTransforming ? { boxShadow: `0 8px 40px -8px ${currentStyle.glow}` } : {}}
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
                        <img
                          src={`/api/transform/${transformJobId}/download`}
                          alt={`${style} transformation`}
                          className="w-full h-full object-contain"
                        />
                        {/* Success badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs font-semibold text-white">AI Enhanced HD</span>
                        </div>
                      </div>
                      <div className="p-4 border-t border-white/5">
                        <button
                          onClick={() => handleDownload(transformJobId, `${style}-creative`)}
                          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${currentStyle.gradient} hover:opacity-90 transition-opacity shadow-lg`}
                          style={{ boxShadow: `0 4px 20px -4px ${currentStyle.glow}` }}
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
                        <div className="absolute inset-0 blur-3xl rounded-full opacity-60 animate-pulse-glow"
                          style={{ background: `radial-gradient(circle, ${currentStyle.glow}, transparent)` }} />
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentStyle.gradient} flex items-center justify-center relative shadow-2xl animate-float`}>
                          <Loader2 className="w-9 h-9 text-white animate-spin" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black text-white mb-1">{currentStyle.emoji} Creating {currentStyle.label}</h3>
                        <p className="text-sm text-zinc-400">AI is enhancing your photo in HD. Usually 45–75 seconds.</p>
                      </div>
                      <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${currentStyle.gradient} rounded-full`}
                          initial={{ width: "0%" }}
                          animate={{ width: "92%" }}
                          transition={{ duration: 55, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600">Face detection · Style transfer · CodeFormer HD enhancement</p>
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
                            className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center text-sm shadow-lg animate-float`}
                            style={{
                              top: i < 2 ? "-12px" : "auto",
                              bottom: i >= 2 ? "-12px" : "auto",
                              left: i % 2 === 0 ? "-12px" : "auto",
                              right: i % 2 === 1 ? "-12px" : "auto",
                              animationDelay: `${i * 1}s`
                            }}
                          >
                            {s.emoji}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-zinc-300 font-bold text-lg">Your masterpiece awaits</p>
                        <p className="text-zinc-600 text-sm mt-1">Upload a photo and pick a style to begin</p>
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
