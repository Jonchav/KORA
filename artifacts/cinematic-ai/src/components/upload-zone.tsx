import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, selectedFile, disabled }: UploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileSelect(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    },
    [onFileSelect, previewUrl]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleChangePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    e.target.value = "";
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: disabled || !!selectedFile,
  });

  return (
    <div className="relative w-full space-y-2">
      {/* Hidden file input for "change photo" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        {...getRootProps()}
        className={cn(
          "relative w-full aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-300 outline-none flex items-center justify-center cursor-pointer",
          isDragActive ? "border-primary/50 bg-primary/5" : "border-white/10 bg-white/5",
          !selectedFile && "border-2 border-dashed hover:border-primary/30 hover:bg-white/10",
          disabled && "opacity-50 cursor-not-allowed",
          "shadow-2xl shadow-black/50"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {selectedFile && previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              {/* Always-visible X button top-right */}
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition-all border border-white/10"
                  title="Quitar foto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center p-8"
            >
              <div
                className={cn(
                  "p-5 rounded-full mb-6 transition-colors duration-300",
                  isDragActive ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-400"
                )}
              >
                <UploadCloud className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display text-zinc-100 mb-2">
                {isDragActive ? "Suelta aquí" : "Sube una foto"}
              </h3>
              <p className="text-zinc-400 max-w-[280px] text-sm">
                Arrastra tu foto o haz clic para elegir. JPG, PNG, WebP hasta 10 MB.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10" />
      </div>

      {/* Always-visible "Cambiar foto" button below the image */}
      <AnimatePresence>
        {selectedFile && !disabled && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={handleChangePhoto}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.07] bg-white/[0.04] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Cambiar foto
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
