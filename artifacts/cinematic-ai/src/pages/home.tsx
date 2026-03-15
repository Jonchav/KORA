import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/upload-zone";
import { PresetCard, type PresetType } from "@/components/preset-card";
import { useTransformMutation, useTransformPolling } from "@/hooks/use-transform";
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, RotateCcw, AlertTriangle, Clapperboard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ id: PresetType; title: string; description: string }> = [
  {
    id: "cinematic",
    title: "Classic Cinematic",
    description: "Teal and orange grading with soft film halation.",
  },
  {
    id: "scifi",
    title: "Sci-Fi",
    description: "Cyberpunk aesthetics, neon highlights, and deep shadows.",
  },
  {
    id: "neo_noir",
    title: "Neo-Noir",
    description: "High contrast, moody monochrome with sharp lighting.",
  },
  {
    id: "warm_hollywood",
    title: "Warm Hollywood",
    description: "Golden hour warmth, nostalgic sepia tones.",
  },
  {
    id: "dramatic_portrait",
    title: "Dramatic Portrait",
    description: "Intense studio lighting with a subtle vignette.",
  },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<PresetType>("cinematic");
  const [letterbox, setLetterbox] = useState(true);
  
  const [jobId, setJobId] = useState<string | null>(null);

  const mutation = useTransformMutation();
  const { data: statusData, isLoading: isPolling, error: pollError } = useTransformPolling(jobId);

  const handleTransform = async () => {
    if (!file) return;
    try {
      const result = await mutation.mutateAsync({ image: file, preset, letterbox });
      setJobId(result.jobId);
    } catch (err) {
      console.error("Failed to start transformation", err);
    }
  };

  const reset = () => {
    setFile(null);
    setJobId(null);
    mutation.reset();
  };

  const handleDownload = async () => {
    if (!statusData?.imageUrl) return;
    try {
      const response = await fetch(statusData.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cinematic-${preset}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback to opening in new tab
      window.open(statusData.imageUrl, "_blank");
    }
  };

  const isProcessing = mutation.isPending || (jobId && statusData?.status !== "completed" && statusData?.status !== "failed");
  const isCompleted = statusData?.status === "completed";
  const hasError = mutation.isError || statusData?.status === "failed" || pollError;
  const errorMessage = mutation.error?.message || statusData?.error || pollError?.message || "An unexpected error occurred.";

  return (
    <div className="min-h-screen relative pb-24">
      {/* Background with the generated image and an overlay gradient */}
      <div className="fixed inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/cinematic-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">
        
        {/* Header */}
        <header className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl"
          >
            <Clapperboard className="w-8 h-8 text-primary" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-white to-zinc-400 mb-6 tracking-tight text-glow"
          >
            Cinematic AI Transformer
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-2xl mx-auto font-sans"
          >
            Elevate your standard photos into breathtaking cinematic shots. Choose your genre, set the mood, and let AI direct the lighting.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Image Area */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative">
              {isCompleted && statusData?.imageUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden glass-panel group"
                >
                  <img 
                    src={statusData.imageUrl} 
                    alt="Transformed result" 
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle letterbox visualization if selected and applied */}
                  {letterbox && (
                    <>
                      <div className="absolute top-0 inset-x-0 h-[10%] bg-black" />
                      <div className="absolute bottom-0 inset-x-0 h-[10%] bg-black" />
                    </>
                  )}
                </motion.div>
              ) : (
                <UploadZone 
                  onFileSelect={setFile} 
                  selectedFile={file} 
                  disabled={isProcessing} 
                />
              )}

              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl border border-white/10"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                      <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
                    </div>
                    <h3 className="mt-6 text-xl font-display text-white text-glow-primary">
                      Directing your scene...
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400 max-w-[250px] text-center font-sans">
                      Applying the {preset.replace('_', ' ')} aesthetic. This may take up to 60 seconds.
                    </p>
                    
                    {/* Fake progress bar to show activity */}
                    <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 45, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {hasError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-destructive-foreground">Transformation Failed</h4>
                  <p className="text-sm text-destructive-foreground/80 mt-1">{errorMessage}</p>
                  <button 
                    onClick={() => {
                      setJobId(null);
                      mutation.reset();
                    }}
                    className="mt-3 text-xs font-medium px-3 py-1.5 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}

            {isCompleted && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_-5px_rgba(234,179,8,0.5)] hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)]"
                >
                  <Download className="w-5 h-5" />
                  Download Cinematic Image
                </button>
                <button
                  onClick={reset}
                  className="px-6 flex items-center justify-center gap-2 py-4 rounded-xl bg-white/5 text-white font-medium border border-white/10 hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              
              <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Select Aesthetic
              </h2>

              <div className="space-y-3 mb-8">
                {PRESETS.map((p) => (
                  <PresetCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    description={p.description}
                    selected={preset === p.id}
                    onClick={setPreset}
                    disabled={isProcessing}
                  />
                ))}
              </div>

              <div className="p-5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between mb-8">
                <div>
                  <h4 className="font-semibold text-zinc-100">Cinematic Letterbox</h4>
                  <p className="text-sm text-zinc-400 mt-1">Add 2.39:1 black bars</p>
                </div>
                <Switch 
                  checked={letterbox} 
                  onCheckedChange={setLetterbox} 
                  disabled={isProcessing}
                />
              </div>

              {!isCompleted && (
                <button
                  onClick={handleTransform}
                  disabled={!file || isProcessing}
                  className={cn(
                    "w-full py-4 rounded-xl font-display font-bold text-lg tracking-wide transition-all duration-300",
                    "flex items-center justify-center gap-2",
                    file && !isProcessing
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)] hover:-translate-y-0.5"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  )}
                >
                  <Clapperboard className="w-5 h-5" />
                  {isProcessing ? "Processing..." : "Generate Scene"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
