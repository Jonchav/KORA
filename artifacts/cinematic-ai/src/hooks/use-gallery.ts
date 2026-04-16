import { useQuery } from "@tanstack/react-query";
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
