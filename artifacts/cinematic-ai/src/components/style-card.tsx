import { cn } from "@/lib/utils";
import type { StyleType } from "@/hooks/use-transform";

export interface StyleConfig {
  id: StyleType;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  glow: string;
}

export const STYLES: StyleConfig[] = [
  {
    id: "comic",
    label: "Comic Book",
    description: "Bold outlines, halftone dots, hero action",
    emoji: "💥",
    gradient: "from-yellow-400 to-orange-500",
    glow: "rgba(251,191,36,0.4)",
  },
  {
    id: "anime",
    label: "Anime",
    description: "Studio Ghibli style, vibrant cel art",
    emoji: "✨",
    gradient: "from-pink-400 to-purple-500",
    glow: "rgba(236,72,153,0.4)",
  },
  {
    id: "popart",
    label: "Pop Art",
    description: "Andy Warhol, bold graphic silkscreen",
    emoji: "🎨",
    gradient: "from-red-400 to-pink-500",
    glow: "rgba(239,68,68,0.4)",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    description: "Soft washes, brushstrokes, fine art",
    emoji: "🎭",
    gradient: "from-cyan-400 to-blue-500",
    glow: "rgba(34,211,238,0.4)",
  },
  {
    id: "oilpainting",
    label: "Oil Painting",
    description: "Old Masters, impasto, museum quality",
    emoji: "🖌️",
    gradient: "from-amber-500 to-yellow-600",
    glow: "rgba(245,158,11,0.4)",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    description: "Neon glow, glitch, Blade Runner vibe",
    emoji: "⚡",
    gradient: "from-violet-500 to-cyan-500",
    glow: "rgba(139,92,246,0.4)",
  },
];

interface StyleCardProps {
  config: StyleConfig;
  selected: boolean;
  onClick: (id: StyleType) => void;
  disabled?: boolean;
}

export function StyleCard({ config, selected, onClick, disabled }: StyleCardProps) {
  return (
    <button
      onClick={() => !disabled && onClick(config.id)}
      disabled={disabled}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 group",
        selected
          ? "border-transparent bg-gradient-to-r " + config.gradient + " shadow-lg"
          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      style={selected ? { boxShadow: `0 0 20px -4px ${config.glow}` } : {}}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
        selected ? "bg-white/20" : "bg-white/5"
      )}>
        {config.emoji}
      </div>
      <div className="min-w-0">
        <p className={cn("font-semibold text-sm leading-tight", selected ? "text-white" : "text-zinc-200")}>
          {config.label}
        </p>
        <p className={cn("text-xs mt-0.5 leading-tight truncate", selected ? "text-white/80" : "text-zinc-500")}>
          {config.description}
        </p>
      </div>
      {selected && (
        <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
      )}
    </button>
  );
}
