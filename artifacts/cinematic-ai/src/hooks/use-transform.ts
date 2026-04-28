import { useMutation, useQuery } from "@tanstack/react-query";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const TOKEN_KEY = "kora_auth_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type StyleType = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk" | "pixel" | "clay" | "toy" | "vaporwave" | "fantasy" | "gtasa" | "dccomic" | "fortnite" | "luxury" | "hollywood" | "sims" | "timetraveler" | "matrix" | "titanic" | "starwars" | "godfather" | "madmax" | "interstellar" | "gatsby" | "wonderwoman" | "studiowhite" | "studiogray" | "studiodark" | "studiobw" | "studiogold" | "studiocrimson" | "studioduo" | "studiopurple";
export type FormatType = "square" | "portrait" | "story" | "landscape";

export interface JobResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
  style: string;
  mode: "transform" | "generate";
}

export function useTransformMutation() {
  return useMutation({
    mutationFn: async (data: { image: File; style: StyleType; format: FormatType }) => {
      const formData = new FormData();
      formData.append("image", data.image);
      formData.append("style", data.style);
      formData.append("format", data.format);

      const res = await fetch(`${API_BASE}/api/transform`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.error || "";
        if (code === "no_credits") throw new Error("Sin créditos — recarga tokens para continuar");
        if (code === "invalid_style") throw new Error("Estilo no válido. Actualiza la app e intenta de nuevo");
        if (code === "missing_file") throw new Error("No se recibió la imagen. Intenta de nuevo");
        throw new Error(err.message || `Error ${res.status}: no se pudo iniciar la transformación`);
      }
      return res.json() as Promise<JobResult>;
    },
  });
}

export function useGenerateMutation() {
  return useMutation({
    mutationFn: async (data: { style: StyleType; format: FormatType }) => {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.error || "";
        if (code === "no_credits") throw new Error("Sin créditos — recarga tokens para continuar");
        if (code === "invalid_style") throw new Error("Estilo no válido. Actualiza la app e intenta de nuevo");
        throw new Error(err.message || `Error ${res.status}: no se pudo iniciar la generación`);
      }
      return res.json() as Promise<JobResult>;
    },
  });
}

export function useJobPolling(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const res = await fetch(`${API_BASE}/api/transform/${jobId}/status`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json() as Promise<JobResult>;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2500;
    },
    retry: 3,
  });
}
