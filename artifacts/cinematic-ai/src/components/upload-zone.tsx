import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, selectedFile, disabled }: UploadZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileSelect(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    },
    [onFileSelect]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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
            className="absolute inset-0 w-full h-full group"
          >
            <img
              src={previewUrl}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-4 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-xl hover:scale-105 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
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
              {isDragActive ? "Drop image here" : "Upload an image"}
            </h3>
            <p className="text-zinc-400 max-w-[280px] text-sm">
              Drag and drop your photo, or click to browse. Any subject — faces, landscapes, objects. JPG, PNG up to 10MB.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative cinematic borders */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}
