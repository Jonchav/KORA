import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/auth-context";
import { Zap } from "lucide-react";
import { useState } from "react";
import { TermsPage } from "@/pages/terms";

const BG_IMAGES = [
  "/examples/man-gtasa.jpg",
  "/examples/selfie-dccomic.jpg",
  "/examples/anime-v2.jpg",
  "/examples/cyberpunk-v2.jpg",
  "/examples/girl-clay.jpg",
  "/examples/denim-vapor.jpg",
  "/examples/popart-v2.jpg",
  "/examples/comic-v2.jpg",
  "/examples/flower-fantasy.jpg",
  "/examples/park-anime.jpg",
  "/examples/red-toy.jpg",
  "/examples/man-cyber.jpg",
  "/examples/oilpainting-v2.jpg",
  "/examples/watercolor-v2.jpg",
  "/examples/cafe-pixel.jpg",
  "/examples/mountain-oil.jpg",
  "/examples/field-anime.jpg",
  "/examples/fiat-comic.jpg",
];

function BackgroundGrid() {
  const cols = 3;
  const perCol = Math.ceil(BG_IMAGES.length / cols);
  const columns = Array.from({ length: cols }, (_, i) =>
    BG_IMAGES.slice(i * perCol, (i + 1) * perCol)
  );

  const offsets = ["0px", "-80px", "-40px"];
  const durations = ["28s", "22s", "25s"];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Grid of images */}
      <div
        className="absolute inset-0 flex gap-2 px-2"
        style={{ transform: "rotate(-4deg) scale(1.12)", transformOrigin: "center center" }}
      >
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="flex-1 flex flex-col gap-2"
            style={{
              marginTop: offsets[ci],
              animation: `scrollCol${ci} ${durations[ci]} linear infinite`,
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...col, ...col].map((src, idx) => (
              <div
                key={idx}
                className="w-full rounded-xl overflow-hidden shrink-0"
                style={{ aspectRatio: "4/5" }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Overlay layers */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 10%, rgba(9,9,11,0.85) 80%, rgb(9,9,11) 100%)",
        }}
      />
      {/* Top / bottom fade */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <style>{`
        @keyframes scrollCol0 { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes scrollCol1 { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        @keyframes scrollCol2 { from { transform: translateY(-20%); } to { transform: translateY(-70%); } }
      `}</style>
    </div>
  );
}

export function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  if (showTerms) {
    return <TermsPage onBack={() => setShowTerms(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <BackgroundGrid />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2">
            <img
              src="/kora-logo.png"
              alt="KORA"
              className="h-28 w-28 object-contain"
              style={{ filter: 'drop-shadow(0 0 18px #6699ff) drop-shadow(0 0 40px #4466ff44)' }}
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">KORA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            AI Creative<br />Studio
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Transform your photos into stunning AI art.<br />
            Sign in to get started.
          </p>
        </div>

        {/* Login card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-5">
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase">
            Sign in to continue
          </p>

          <GoogleLogin
            onSuccess={async (resp) => {
              try {
                setError(null);
                if (!resp.credential) throw new Error("No credential received from Google");
                await loginWithGoogle(resp.credential);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(`Error: ${msg}`);
              }
            }}
            onError={() => setError("Google popup was closed or blocked.")}
            theme="filled_black"
            shape="pill"
            size="large"
            text="continue_with"
            locale="en"
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <p className="text-[11px] text-zinc-700 text-center leading-relaxed">
            Al continuar aceptas nuestros{" "}
            <button
              onClick={() => setShowTerms(true)}
              className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
            >
              Términos y Condiciones
            </button>
            .<br />Tu información nunca se vende ni comparte.
          </p>
        </div>
      </div>
    </div>
  );
}
