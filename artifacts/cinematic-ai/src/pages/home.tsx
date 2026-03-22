import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import { StyleCard, STYLES } from "@/components/style-card";
import { FormatSelector } from "@/components/format-selector";
import { useTransformMutation, useGenerateMutation, useJobPolling } from "@/hooks/use-transform";
import type { StyleType, FormatType } from "@/hooks/use-transform";
import {
  Loader2, Download, RotateCcw, AlertTriangle,
  Sparkles, Wand2, ImageIcon, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  // --- Transform state ---
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<StyleType>("comic");
  const [format, setFormat] = useState<FormatType>("square");
  const [transformJobId, setTransformJobId] = useState<string | null>(null);

  // --- Seedream state ---
  const [seedStyle, setSeedStyle] = useState<StyleType>("comic");
  const [seedFormat, setSeedFormat] = useState<FormatType>("landscape");
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);

  const transformMutation = useTransformMutation();
  const generateMutation = useGenerateMutation();
  const { data: transformStatus } = useJobPolling(transformJobId);
  const { data: generateStatus } = useJobPolling(generateJobId);

  const isTransforming = transformMutation.isPending ||
    (!!transformJobId && transformStatus?.status !== "completed" && transformStatus?.status !== "failed");
  const isGenerating = generateMutation.isPending ||
    (!!generateJobId && generateStatus?.status !== "completed" && generateStatus?.status !== "failed");

  const transformDone = transformStatus?.status === "completed";
  const generateDone = generateStatus?.status === "completed";

  const handleTransform = async () => {
    if (!file) return;
    setTransformJobId(null);
    transformMutation.reset();
    try {
      const result = await transformMutation.mutateAsync({ image: file, style, format });
      setTransformJobId(result.jobId);
    } catch (e) { console.error(e); }
  };

  const handleGenerate = async () => {
    setGenerateJobId(null);
    generateMutation.reset();
    try {
      const result = await generateMutation.mutateAsync({ style: seedStyle, format: seedFormat });
      setGenerateJobId(result.jobId);
    } catch (e) { console.error(e); }
  };

  const handleDownload = async (jobId: string, label: string) => {
    try {
      const response = await fetch(`/api/transform/${jobId}/download`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const resetTransform = () => {
    setFile(null);
    setTransformJobId(null);
    transformMutation.reset();
  };

  const currentStyle = STYLES.find(s => s.id === style)!;
  const currentSeedStyle = STYLES.find(s => s.id === seedStyle)!;

  return (
    <div className="min-h-screen pb-20">
      {/* Gradient background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute -top-20 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16">

        {/* Header */}
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">AI Creative Studio</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 mb-4 tracking-tight"
          >
            Transform Your Photos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base text-zinc-400 max-w-xl mx-auto"
          >
            Turn any photo into Comic, Anime, Pop Art and more — or generate stunning AI scenes with Seedream for your social media.
          </motion.p>
        </header>

        {/* ======= SECTION 1: PHOTO TRANSFORMER ======= */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Photo Transformer</h2>
              <p className="text-xs text-zinc-500">Upload your photo → choose a style → AI transforms it while keeping your face</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* Upload */}
              {!transformDone && (
                <div className="glass-panel rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                    Upload Photo
                  </h3>
                  <UploadZone onFileSelect={setFile} selectedFile={file} disabled={isTransforming} />
                </div>
              )}

              {/* Style selector */}
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                  Choose Style
                </h3>
                <div className="space-y-2">
                  {STYLES.map(s => (
                    <StyleCard key={s.id} config={s} selected={style === s.id} onClick={setStyle} disabled={isTransforming} />
                  ))}
                </div>
              </div>

              {/* Format selector */}
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                  Output Format
                </h3>
                <FormatSelector value={format} onChange={setFormat} disabled={isTransforming} />
              </div>

              {/* CTA */}
              {!transformDone && (
                <button
                  onClick={handleTransform}
                  disabled={!file || isTransforming}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2",
                    file && !isTransforming
                      ? `bg-gradient-to-r ${currentStyle.gradient} text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl`
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  )}
                  style={file && !isTransforming ? { boxShadow: `0 8px 30px -8px ${currentStyle.glow}` } : {}}
                >
                  {isTransforming
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Transforming...</>
                    : <><Sparkles className="w-4 h-4" /> Transform to {currentStyle.label}</>
                  }
                </button>
              )}

              {transformDone && (
                <button
                  onClick={resetTransform}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4" /> Transform another photo
                </button>
              )}
            </div>

            {/* Right: Result */}
            <div className="lg:col-span-7">
              <div className="glass-panel rounded-2xl overflow-hidden h-full min-h-[400px] flex flex-col">
                <AnimatePresence mode="wait">
                  {transformDone && transformJobId ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="relative flex-1 min-h-[340px]">
                        <img
                          src={`/api/transform/${transformJobId}/download`}
                          alt={`${style} transformation`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-4 border-t border-white/5 flex gap-3">
                        <button
                          onClick={() => handleDownload(transformJobId, `${style}-creative`)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${currentStyle.gradient} hover:opacity-90 transition-opacity`}
                        >
                          <Download className="w-4 h-4" /> Download Image
                        </button>
                      </div>
                    </motion.div>
                  ) : isTransforming ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 blur-2xl rounded-full opacity-40"
                          style={{ background: `radial-gradient(circle, ${currentStyle.glow}, transparent)` }} />
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentStyle.gradient} flex items-center justify-center relative shadow-xl`}>
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-white">{currentStyle.emoji} Creating {currentStyle.label}...</h3>
                        <p className="text-sm text-zinc-400 mt-1">Transforming and enhancing your photo. Usually 45–75 seconds.</p>
                      </div>
                      <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${currentStyle.gradient}`}
                          initial={{ width: "0%" }}
                          animate={{ width: "90%" }}
                          transition={{ duration: 50, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  ) : transformStatus?.status === "failed" ? (
                    <motion.div key="error" className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                      <AlertTriangle className="w-10 h-10 text-red-400" />
                      <h3 className="text-base font-semibold text-red-300">Transformation Failed</h3>
                      <p className="text-sm text-zinc-400 text-center max-w-xs">{transformStatus.error || "An unexpected error occurred."}</p>
                      <button onClick={resetTransform} className="mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition">
                        Try again
                      </button>
                    </motion.div>
                  ) : transformMutation.isError ? (
                    <motion.div key="error-mut" className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                      <AlertTriangle className="w-10 h-10 text-red-400" />
                      <p className="text-sm text-zinc-400 text-center">{transformMutation.error?.message}</p>
                      <button onClick={resetTransform} className="mt-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">Try again</button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
                    >
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-zinc-400 font-medium">Your transformed image will appear here</p>
                        <p className="text-zinc-600 text-sm mt-1">Upload a photo and select a style to begin</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ======= SECTION 2: SEEDREAM SCENE GENERATOR ======= */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Seedream Scene Generator</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-widest">
                  Seedream 3
                </span>
              </div>
              <p className="text-xs text-zinc-500">Generate stunning 2K social media scenes with ByteDance's Seedream 3 — no photo needed</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-violet-500/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Controls */}
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">Choose Scene Style</h3>
                  <div className="space-y-2">
                    {STYLES.map(s => (
                      <StyleCard key={s.id} config={s} selected={seedStyle === s.id} onClick={setSeedStyle} disabled={isGenerating} />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">Output Format</h3>
                  <FormatSelector value={seedFormat} onChange={setSeedFormat} disabled={isGenerating} />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2",
                    !isGenerating
                      ? `bg-gradient-to-r ${currentSeedStyle.gradient} text-white shadow-lg hover:-translate-y-0.5`
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  )}
                  style={!isGenerating ? { boxShadow: `0 8px 30px -8px ${currentSeedStyle.glow}` } : {}}
                >
                  {isGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating with Seedream...</>
                    : <><Sparkles className="w-4 h-4" /> Generate {currentSeedStyle.label} Scene</>
                  }
                </button>
              </div>

              {/* Result */}
              <div className="lg:col-span-7">
                <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5 min-h-[360px] flex flex-col">
                  <AnimatePresence mode="wait">
                    {generateDone && generateJobId ? (
                      <motion.div
                        key="gen-result"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col"
                      >
                        <div className="relative flex-1 min-h-[300px]">
                          <img
                            src={`/api/transform/${generateJobId}/download`}
                            alt={`${seedStyle} scene`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="p-4 border-t border-white/5">
                          <button
                            onClick={() => handleDownload(generateJobId, `${seedStyle}-seedream-scene`)}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${currentSeedStyle.gradient} hover:opacity-90 transition-opacity`}
                          >
                            <Download className="w-4 h-4" /> Download Scene
                          </button>
                        </div>
                      </motion.div>
                    ) : isGenerating ? (
                      <motion.div
                        key="gen-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 blur-2xl rounded-full opacity-40"
                            style={{ background: `radial-gradient(circle, ${currentSeedStyle.glow}, transparent)` }} />
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentSeedStyle.gradient} flex items-center justify-center relative shadow-xl`}>
                            <Sparkles className="w-8 h-8 text-white animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-base font-bold text-white">Seedream is painting your scene...</h3>
                          <p className="text-xs text-zinc-400 mt-1">Generating 2K {currentSeedStyle.label} artwork. Usually 20–40 seconds.</p>
                        </div>
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${currentSeedStyle.gradient}`}
                            initial={{ width: "0%" }}
                            animate={{ width: "90%" }}
                            transition={{ duration: 35, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    ) : generateStatus?.status === "failed" ? (
                      <motion.div key="gen-error" className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                        <p className="text-sm text-zinc-400 text-center">{generateStatus.error || "Generation failed."}</p>
                        <button onClick={() => { setGenerateJobId(null); generateMutation.reset(); }} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">Try again</button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="gen-placeholder"
                        className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
                      >
                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-violet-500/30 flex items-center justify-center bg-violet-500/5">
                          <Sparkles className="w-8 h-8 text-violet-500/50" />
                        </div>
                        <div>
                          <p className="text-zinc-400 font-medium">Your Seedream scene will appear here</p>
                          <p className="text-zinc-600 text-sm mt-1">Select a style and click Generate</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
