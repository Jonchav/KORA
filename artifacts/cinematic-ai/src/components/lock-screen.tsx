import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface LockScreenProps {
  onLogin: (password: string) => Promise<boolean>;
  error: string | null;
  loading: boolean;
}

export function LockScreen({ onLogin, error, loading }: LockScreenProps) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    await onLogin(value);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">
            <Lock className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-display tracking-tight text-white">KORA</h1>
            <p className="text-zinc-500 text-sm mt-1 tracking-widest uppercase text-xs">Private access</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="password"
              placeholder="Enter access code"
              value={value}
              onChange={e => setValue(e.target.value)}
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="w-full bg-white text-black font-medium text-sm py-3 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Enter"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
