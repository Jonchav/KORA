import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./use-transform";

const TOKEN_KEY = "kora_auth_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface GalleryItem {
  id: string;
  style: string;
  format: string;
  mode: "transform" | "generate";
  watermark: boolean;
  createdAt: string;
  downloadUrl: string | null;
}

export function useGallery() {
  return useQuery<{ items: GalleryItem[] }>({
    queryKey: ["gallery"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/gallery`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/gallery/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<{ items: GalleryItem[] }>(["gallery"], (old) => {
        if (!old) return old;
        return { items: old.items.filter((item) => item.id !== id) };
      });
    },
  });
}
