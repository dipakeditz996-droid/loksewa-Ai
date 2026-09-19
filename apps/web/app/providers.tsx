"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_MUTATION_EVENT } from "@/lib/api/client";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // A successful write anywhere may change admin dashboard aggregates
  // (approve a question, delete a user, change exam status, approve a
  // marketplace item...). Mark those cached queries stale so they revalidate
  // immediately if mounted, or on next visit - cached data still renders first.
  useEffect(() => {
    const invalidate = () => {
      for (const key of [
        "admin-dashboard-stats",
        "admin-exams-overview",
        "admin-ai-tutor-overview",
        "admin-marketplace-overview",
        "admin-analytics",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    window.addEventListener(API_MUTATION_EVENT, invalidate);
    return () => window.removeEventListener(API_MUTATION_EVENT, invalidate);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
