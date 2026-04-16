import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./use-transform";

const TOKEN_KEY = "kora_auth_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface BillingInfo {
  tier: "free" | "mini" | "plus" | "pro" | "creator";
  credits: number;
  monthlyResetAt: string;
}

export function useBilling() {
  return useQuery<BillingInfo>({
    queryKey: ["billing"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/me`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch billing info");
      return res.json();
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (params: { type: "pack"; itemId: string }) => {
      const res = await fetch(`${API_BASE}/api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to create checkout session");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/billing/portal`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const { url } = await res.json();
      if (url) window.location.href = url;
    },
  });
}

export function useInvalidateBilling() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["billing"] });
}
