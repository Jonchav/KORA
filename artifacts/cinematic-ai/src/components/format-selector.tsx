import { cn } from "@/lib/utils";
import type { FormatType } from "@/hooks/use-transform";

interface FormatOption {
  id: FormatType;
  label: string;
  sublabel: string;
  w: number;
  h: number;
}

const FORMATS: FormatOption[] = [
  { id: "square",    label: "Square",    sublabel: "1:1 · Instagram",   w: 24, h: 24 },
  { id: "portrait",  label: "Portrait",  sublabel: "4:5 · Feed",        w: 20, h: 25 },
  { id: "story",     label: "Story",     sublabel: "9:16 · Stories",    w: 14, h: 25 },
  { id: "landscape", label: "Landscape", sublabel: "16:9 · Twitter",    w: 28, h: 16 },
];

interface FormatSelectorProps {
  value: FormatType;
  onChange: (f: FormatType) => void;
  disabled?: boolean;
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FORMATS.map((f) => (
        <button
          key={f.id}
          onClick={() => !disabled && onChange(f.id)}
          disabled={disabled}
          className={cn(
            "flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all",
            value === f.id
              ? "border-primary bg-primary/10 shadow-[0_0_12px_-4px_rgba(234,179,8,0.5)]"
              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-center h-7">
            <div
              className={cn(
                "rounded border-2 transition-colors",
                value === f.id ? "border-primary bg-primary/20" : "border-zinc-500 bg-zinc-700/40"
              )}
              style={{ width: f.w / 1.8, height: f.h / 1.8 }}
            />
          </div>
          <div className="text-center">
            <p className={cn("text-xs font-semibold leading-tight", value === f.id ? "text-primary" : "text-zinc-300")}>
              {f.label}
            </p>
            <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">{f.sublabel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
