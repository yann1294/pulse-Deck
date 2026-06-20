"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setApiAuthTokenProvider } from "@/lib/api";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const { getToken } = useAuth();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false
          },
          mutations: {
            retry: 0
          }
        }
      })
  );

  useEffect(() => {
    setApiAuthTokenProvider(() => getToken());

    return () => setApiAuthTokenProvider(null);
  }, [getToken]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
