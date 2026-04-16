import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, ImageIcon, Loader2, RefreshCw, Sparkles, Clock } from "lucide-react";
import { useGallery, type GalleryItem } from "@/hooks/use-gallery";
import { API_BASE } from "@/hooks/use-transform";
import { cn } from "@/lib/utils";

const STYLE_LABELS: Record<string, string> = {
  comic: "Comic Book",
  anime: "Anime",
  popart: "Pop Art",
  watercolor: "Watercolor",
  oilpainting: "Oil Painting",
  cyberpunk: "Cyberpunk",
  pixel: "Pixel Art",
  clay: "Clay",
  toy: "Funko Pop",
  vaporwave: "Vaporwave",
  fantasy: "Fantasy RPG",
  gtasa: "GTA San Andreas",
};

const FORMAT_LABELS: Record<string, string> = {
  square: "Square 1:1",
  portrait: "Portrait 4:5",
  story: "Story 9:16",
  landscape: "Landscape 16:9",
};

function GalleryCard({ item }: { item: GalleryItem }) {
  const downloadUrl = item.downloadUrl ? `${API_BASE}${item.downloadUrl}` : null;
  const date = new Date(item.createdAt).toLocaleDateString("es", {
    day: "numeric", month: "short", year: "numeric",
  });

  const handleDownload = async () => {
    if (!downloadUrl) return;
    try {
      const token = localStorage.getItem("kora_auth_token");
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kora-${item.style}-${item.id.slice(-6)}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-all"
    >
      {/* Image preview area */}
      <div className="aspect-square bg-zinc-900 flex items-center justify-center relative overflow-hidden">
        {downloadUrl ? (
          <ImagePreview url={downloadUrl} style={item.style} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-700">
            <ImageIcon className="w-8 h-8" />
            <p className="text-xs">No disponible</p>
          </div>
        )}

        {/* Overlay on hover */}
        {downloadUrl && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
          </div>
        )}

        {item.watermark && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] text-zinc-400 font-mono">
            MARCA DE AGUA
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3">
        <p className="text-xs font-semibold text-white mb-0.5">{STYLE_LABELS[item.style] || item.style}</p>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">{FORMAT_LABELS[item.format] || item.format}</p>
          <p className="text-[10px] text-zinc-700 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {date}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ImagePreview({ url, style }: { url: string; style: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let objectUrl: string | null = null;
    const token = localStorage.getItem("kora_auth_token");
    // url is already the full absolute URL — do NOT prepend API_BASE again
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error("not ok"); return r.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  if (failed) return (
    <div className="flex flex-col items-center gap-2 text-zinc-700">
      <ImageIcon className="w-6 h-6" />
    </div>
  );
  if (!src) return <Loader2 className="w-5 h-5 text-zinc-700 animate-spin" />;
  return <img src={src} alt={style} className="w-full h-full object-cover" />;
}

interface GalleryPageProps {
  onBack: () => void;
}

export function GalleryPage({ onBack }: GalleryPageProps) {
  const { data, isLoading, isError, refetch, isFetching } = useGallery();
  const items = data?.items ?? [];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }}
        />
        <div className="absolute inset-0 bg-background/92" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            Actualizar
          </button>
        </div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">Mis creaciones</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Tu galería
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Todas tus generaciones guardadas. Descárgalas cuando quieras.
          </p>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20 text-zinc-600"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Cargando tus creaciones...</p>
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-zinc-600"
            >
              <p className="text-sm mb-4">No se pudo cargar la galería.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/5 transition-all"
              >
                Reintentar
              </button>
            </motion.div>
          ) : items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-zinc-400 font-semibold mb-1">Aún no tienes creaciones</p>
              <p className="text-zinc-600 text-sm">Transforma una foto o genera una escena para verla aquí.</p>
              <button
                onClick={onBack}
                className="mt-6 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-zinc-300 hover:bg-white/15 transition-all font-semibold"
              >
                Crear ahora →
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs text-zinc-700 mb-6">{items.length} generacion{items.length !== 1 ? "es" : ""}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <GalleryCard item={item} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
