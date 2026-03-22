import { useMutation, useQuery } from "@tanstack/react-query";

export type StyleType = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk" | "pixel" | "clay" | "toy" | "vaporwave" | "fantasy" | "gtasa";
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

      const res = await fetch("/api/transform", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start transformation");
      }
      return res.json() as Promise<JobResult>;
    },
  });
}

export function useGenerateMutation() {
  return useMutation({
    mutationFn: async (data: { style: StyleType; format: FormatType }) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start generation");
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
      const res = await fetch(`/api/transform/${jobId}/status`);
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
