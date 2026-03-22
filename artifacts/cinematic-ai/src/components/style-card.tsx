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
  {
    id: "pixel",
    label: "Pixel Art",
    description: "Retro 16-bit game sprite, SNES nostalgia",
    emoji: "👾",
    gradient: "from-green-400 to-emerald-600",
    glow: "rgba(52,211,153,0.4)",
  },
  {
    id: "clay",
    label: "Claymation",
    description: "Stop-motion clay, Aardman handcrafted",
    emoji: "🧸",
    gradient: "from-orange-300 to-rose-400",
    glow: "rgba(251,146,60,0.4)",
  },
  {
    id: "toy",
    label: "Funko Pop",
    description: "Vinyl collectible, glossy oversized head",
    emoji: "🪆",
    gradient: "from-sky-400 to-indigo-500",
    glow: "rgba(56,189,248,0.4)",
  },
  {
    id: "vaporwave",
    label: "Vaporwave",
    description: "80s/90s retro-futurism, pastel neon dream",
    emoji: "🌊",
    gradient: "from-fuchsia-400 to-violet-600",
    glow: "rgba(232,121,249,0.4)",
  },
  {
    id: "fantasy",
    label: "Dark Fantasy",
    description: "Epic RPG hero, magical ruins, dragons",
    emoji: "⚔️",
    gradient: "from-slate-600 to-purple-800",
    glow: "rgba(126,34,206,0.4)",
  },
  {
    id: "gtasa",
    label: "San Andrés",
    description: "GTA SA — CJ, Grove Street, Los Santos",
    emoji: "🎮",
    gradient: "from-green-700 to-green-900",
    glow: "rgba(21,128,61,0.5)",
  },
];

interface StyleCardProps {
  config: StyleConfig;
  selected: boolean;
  onClick: (id: StyleType) => void;
  disabled?: boolean;
  index?: number;
}

export function StyleCard({ config, selected, onClick, disabled, index = 0 }: StyleCardProps) {
  return (
    <button
      onClick={() => !disabled && onClick(config.id)}
      disabled={disabled}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 flex items-center gap-4 group",
        selected
          ? "border-white/20 bg-white/[0.06]"
          : "border-white/[0.06] bg-transparent hover:bg-white/[0.03] hover:border-white/12",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className="text-[10px] font-mono text-zinc-700 w-4 shrink-0 select-none">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm tracking-wide transition-colors",
          selected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
        )}>
          {config.label}
        </p>
        <p className={cn(
          "text-[11px] mt-0.5 leading-snug truncate transition-colors",
          selected ? "text-zinc-500" : "text-zinc-700 group-hover:text-zinc-600"
        )}>
          {config.description}
        </p>
      </div>
      <div className={cn(
        "w-3.5 h-3.5 rounded-full border shrink-0 transition-all duration-150",
        selected
          ? "border-white bg-white scale-110"
          : "border-zinc-700 group-hover:border-zinc-500"
      )} />
    </button>
  );
}
