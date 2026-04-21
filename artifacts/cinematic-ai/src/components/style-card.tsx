import { cn } from "@/lib/utils";
import type { StyleType } from "@/hooks/use-transform";

export interface StyleConfig {
  id: StyleType;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  glow: string;
  imgSrc: string;
}

export const STYLES: StyleConfig[] = [
  {
    id: "gtasa",
    label: "San Andrés",
    description: "GTA SA — CJ, Grove Street, Los Santos",
    emoji: "🎮",
    gradient: "from-green-700 to-green-900",
    glow: "rgba(21,128,61,0.5)",
    imgSrc: "/examples/man-gtasa.jpg",
  },
  {
    id: "dccomic",
    label: "DC Clásico",
    description: "Golden age Batman, colores planos, tinta gruesa",
    emoji: "🦇",
    gradient: "from-yellow-400 to-amber-600",
    glow: "rgba(251,191,36,0.45)",
    imgSrc: "/examples/selfie-dccomic.jpg",
  },
  {
    id: "comic",
    label: "Comic Book",
    description: "Bold outlines, halftone dots, hero action",
    emoji: "💥",
    gradient: "from-yellow-400 to-orange-500",
    glow: "rgba(251,191,36,0.4)",
    imgSrc: "/examples/comic-v2.jpg",
  },
  {
    id: "anime",
    label: "Anime",
    description: "Studio Ghibli style, vibrant cel art",
    emoji: "✨",
    gradient: "from-pink-400 to-purple-500",
    glow: "rgba(236,72,153,0.4)",
    imgSrc: "/examples/anime-v2.jpg",
  },
  {
    id: "popart",
    label: "Pop Art",
    description: "Andy Warhol, bold graphic silkscreen",
    emoji: "🎨",
    gradient: "from-red-400 to-pink-500",
    glow: "rgba(239,68,68,0.4)",
    imgSrc: "/examples/popart-v2.jpg",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    description: "Soft washes, brushstrokes, fine art",
    emoji: "🎭",
    gradient: "from-cyan-400 to-blue-500",
    glow: "rgba(34,211,238,0.4)",
    imgSrc: "/examples/watercolor-v2.jpg",
  },
  {
    id: "oilpainting",
    label: "Oil Painting",
    description: "Old Masters, impasto, museum quality",
    emoji: "🖌️",
    gradient: "from-amber-500 to-yellow-600",
    glow: "rgba(245,158,11,0.4)",
    imgSrc: "/examples/oilpainting-v2.jpg",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    description: "Neon glow, glitch, Blade Runner vibe",
    emoji: "⚡",
    gradient: "from-violet-500 to-cyan-500",
    glow: "rgba(139,92,246,0.4)",
    imgSrc: "/examples/cyberpunk-v2.jpg",
  },
  {
    id: "pixel",
    label: "Pixel Art",
    description: "Retro 16-bit game sprite, SNES nostalgia",
    emoji: "👾",
    gradient: "from-green-400 to-emerald-600",
    glow: "rgba(52,211,153,0.4)",
    imgSrc: "/examples/cafe-pixel.jpg",
  },
  {
    id: "clay",
    label: "Claymation",
    description: "Stop-motion clay, Aardman handcrafted",
    emoji: "🧸",
    gradient: "from-orange-300 to-rose-400",
    glow: "rgba(251,146,60,0.4)",
    imgSrc: "/examples/girl-clay.jpg",
  },
  {
    id: "toy",
    label: "Funko Pop",
    description: "Vinyl collectible, glossy oversized head",
    emoji: "🪆",
    gradient: "from-sky-400 to-indigo-500",
    glow: "rgba(56,189,248,0.4)",
    imgSrc: "/examples/red-toy.jpg",
  },
  {
    id: "vaporwave",
    label: "Vaporwave",
    description: "80s/90s retro-futurism, pastel neon dream",
    emoji: "🌊",
    gradient: "from-fuchsia-400 to-violet-600",
    glow: "rgba(232,121,249,0.4)",
    imgSrc: "/examples/denim-vapor.jpg",
  },
  {
    id: "fantasy",
    label: "Dark Fantasy",
    description: "Epic RPG hero, magical ruins, dragons",
    emoji: "⚔️",
    gradient: "from-slate-600 to-purple-800",
    glow: "rgba(126,34,206,0.4)",
    imgSrc: "/examples/flower-fantasy.jpg",
  },
  {
    id: "fortnite",
    label: "Fortnite",
    description: "Battle Royale skin, Unreal Engine style",
    emoji: "🎯",
    gradient: "from-blue-500 to-indigo-700",
    glow: "rgba(99,102,241,0.5)",
    imgSrc: "/examples/girl-fortnite.jpg",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Designer suits, Rolex, Monaco lifestyle",
    emoji: "💎",
    gradient: "from-yellow-600 to-zinc-800",
    glow: "rgba(202,138,4,0.45)",
    imgSrc: "/examples/man-luxury.jpg",
  },
  {
    id: "hollywood",
    label: "Hollywood",
    description: "Golden age glamour, red carpet, spotlight",
    emoji: "🎬",
    gradient: "from-amber-500 to-red-800",
    glow: "rgba(245,158,11,0.45)",
    imgSrc: "/examples/man-hollywood.jpg",
  },
  {
    id: "sims",
    label: "The Sims",
    description: "Maxis 3D character, Plumbob, suburb life",
    emoji: "🏠",
    gradient: "from-green-400 to-teal-600",
    glow: "rgba(52,211,153,0.5)",
    imgSrc: "/examples/man-sims.jpg",
  },
  {
    id: "timetraveler",
    label: "Time Traveler",
    description: "Steampunk, brass gears, time vortex portal",
    emoji: "⏱️",
    gradient: "from-amber-700 to-stone-800",
    glow: "rgba(180,83,9,0.45)",
    imgSrc: "/examples/man-timetraveler.jpg",
  },
];

interface StyleCardProps {
  config: StyleConfig;
  selected: boolean;
  onClick: (id: StyleType) => void;
  disabled?: boolean;
  index?: number;
}

export function StyleCard({ config, selected, onClick, disabled }: StyleCardProps) {
  return (
    <button
      onClick={() => !disabled && onClick(config.id)}
      disabled={disabled}
      className={cn(
        "relative w-full overflow-hidden rounded-xl transition-all duration-200 group",
        "aspect-[3/4]",
        selected
          ? "ring-2 ring-white/70 ring-offset-1 ring-offset-black scale-[0.98]"
          : "ring-1 ring-white/10 hover:ring-white/30",
        disabled && "opacity-40 cursor-not-allowed"
      )}
      style={selected ? { boxShadow: `0 0 20px ${config.glow}` } : {}}
    >
      {/* Thumbnail image */}
      <img
        src={config.imgSrc}
        alt={config.label}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        draggable={false}
      />

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Emoji top-right */}
      <span className="absolute top-2 right-2 text-base drop-shadow-lg select-none">
        {config.emoji}
      </span>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
        <p className={cn(
          "font-semibold text-xs tracking-wide leading-tight",
          selected ? "text-white" : "text-zinc-200"
        )}>
          {config.label}
        </p>
      </div>
    </button>
  );
}
