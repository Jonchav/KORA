import React from "react";
import { cn } from "@/lib/utils";
import { Film, Zap, Moon, Sun, Camera } from "lucide-react";
import { motion } from "framer-motion";

export type PresetType = "cinematic" | "scifi" | "neo_noir" | "warm_hollywood" | "dramatic_portrait";

interface PresetCardProps {
  id: PresetType;
  title: string;
  description: string;
  selected: boolean;
  onClick: (id: PresetType) => void;
  disabled?: boolean;
}

const PRESET_STYLES: Record<PresetType, { gradient: string; icon: React.ReactNode }> = {
  cinematic: {
    gradient: "from-teal-900/40 via-zinc-900/60 to-orange-900/40",
    icon: <Film className="w-5 h-5 text-teal-400" />,
  },
  scifi: {
    gradient: "from-cyan-900/40 via-blue-900/50 to-fuchsia-900/40",
    icon: <Zap className="w-5 h-5 text-cyan-400" />,
  },
  neo_noir: {
    gradient: "from-zinc-950 via-zinc-900 to-zinc-800",
    icon: <Moon className="w-5 h-5 text-zinc-300" />,
  },
  warm_hollywood: {
    gradient: "from-amber-900/40 via-orange-900/40 to-red-900/40",
    icon: <Sun className="w-5 h-5 text-amber-400" />,
  },
  dramatic_portrait: {
    gradient: "from-rose-950/60 via-zinc-900/60 to-zinc-950",
    icon: <Camera className="w-5 h-5 text-rose-400" />,
  },
};

export function PresetCard({ id, title, description, selected, onClick, disabled }: PresetCardProps) {
  const style = PRESET_STYLES[id];

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      className={cn(
        "relative w-full text-left overflow-hidden rounded-xl transition-all duration-300 group",
        "border p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)] bg-primary/5"
          : "border-white/10 hover:border-white/20 bg-white/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", style.gradient)} />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className={cn(
          "p-2.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 transition-colors",
          selected && "border-primary/50 bg-primary/10"
        )}>
          {style.icon}
        </div>
        <div>
          <h4 className={cn(
            "font-display font-semibold text-lg transition-colors",
            selected ? "text-primary" : "text-zinc-100"
          )}>
            {title}
          </h4>
          <p className="text-sm text-zinc-400 mt-1 font-sans">{description}</p>
        </div>
      </div>
      
      {/* Selection indicator glow */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-primary/50" />
      )}
    </motion.button>
  );
}
