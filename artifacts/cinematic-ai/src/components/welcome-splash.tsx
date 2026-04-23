import { motion } from "framer-motion";

interface WelcomeSplashProps {
  onDismiss: () => void;
}

const MOSAIC = [
  // Column 1 — top to bottom
  { src: "/examples/anime-v2.jpg",        tall: false },
  { src: "/examples/man-luxury.jpg",       tall: true  },
  { src: "/examples/cafe-pixel.jpg",       tall: false },

  // Column 2 — center, taller
  { src: "/examples/girl-fortnite.jpg",    tall: true  },
  { src: "/examples/man-hollywood.jpg",    tall: true  },

  // Column 3 — top to bottom
  { src: "/examples/cyberpunk-v2.jpg",     tall: false },
  { src: "/examples/man-sims.jpg",         tall: true  },
  { src: "/examples/denim-vapor.jpg",      tall: false },
];

export function WelcomeSplash({ onDismiss }: WelcomeSplashProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b] overflow-hidden">

      {/* ── Mosaic top half ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Subtle ambient glows */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute bottom-0 left-0 right-0 h-40
                          bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-16
                          bg-gradient-to-b from-[#09090b]/80 to-transparent" />
        </div>

        {/* 3-column staggered grid */}
        <div className="h-full grid grid-cols-3 gap-1.5 p-1.5 pt-3">

          {/* Column 1 */}
          <div className="flex flex-col gap-1.5">
            {[MOSAIC[0], MOSAIC[1], MOSAIC[2]].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
                className={`relative rounded-2xl overflow-hidden ${item.tall ? "flex-[2]" : "flex-[1]"}`}
              >
                <img
                  src={item.src}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>

          {/* Column 2 — offset down to create stagger */}
          <div className="flex flex-col gap-1.5 mt-8">
            {[MOSAIC[3], MOSAIC[4]].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                className="relative rounded-2xl overflow-hidden flex-1"
              >
                <img
                  src={item.src}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-1.5">
            {[MOSAIC[5], MOSAIC[6], MOSAIC[7]].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.07, duration: 0.5, ease: "easeOut" }}
                className={`relative rounded-2xl overflow-hidden ${item.tall ? "flex-[2]" : "flex-[1]"}`}
              >
                <img
                  src={item.src}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Bottom content ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
        className="shrink-0 px-6 pb-10 pt-4 flex flex-col items-center text-center"
      >
        {/* Logo */}
        <img
          src="/kora-logo.png"
          alt="KORA"
          className="h-16 w-16 object-contain mb-3"
          style={{ filter: 'drop-shadow(0 0 12px #6699ffaa)' }}
        />

        <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
          AI Portraits.<br />Tu cara, reimaginada.
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-7">
          Sube una foto y transfórmala en más de 18 estilos artísticos — anime, cyberpunk, GTA y más.
        </p>

        {/* CTA */}
        <button
          onClick={onDismiss}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-base text-white tracking-wide transition-all active:scale-95"
          style={{ background: "#FF3C00" }}
        >
          Comenzar →
        </button>
      </motion.div>

    </div>
  );
}
