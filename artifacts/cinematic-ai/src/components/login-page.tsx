import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/auth-context";
import { Zap } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute -top-40 right-0 w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute inset-0 bg-background/85" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">KORA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            AI Creative<br />Studio
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
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
            By continuing you agree to our terms of service.
            <br />Your data is never stored or sold.
          </p>
        </div>
      </div>
    </div>
  );
}
