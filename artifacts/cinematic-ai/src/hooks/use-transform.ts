import { useMutation, useQuery } from "@tanstack/react-query";

export interface TransformResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  preset: string;
}

export interface TransformStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
  preset: string;
}

interface TransformPayload {
  image: File;
  preset: string;
  letterbox: boolean;
}

export function useTransformMutation() {
  return useMutation({
    mutationFn: async (data: TransformPayload) => {
      const formData = new FormData();
      formData.append("image", data.image);
      formData.append("preset", data.preset);
      formData.append("letterbox", data.letterbox.toString());

      const res = await fetch("/api/transform", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to transform image");
      }

      return res.json() as Promise<TransformResult>;
    },
  });
}

export function useTransformPolling(jobId: string | null) {
  return useQuery({
    queryKey: ["transform", jobId, "status"],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID provided");
      
      const res = await fetch(`/api/transform/${jobId}/status`);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch transformation status");
      }
      
      return res.json() as Promise<TransformStatus>;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when completed or failed
      if (status === "completed" || status === "failed") {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
    retry: 3,
  });
}
