// @/features/overview/hooks/useOverview.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { OverviewData } from "../types";

export function useOverview({ initialData }: { initialData: OverviewData }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const overviewQuery = useQuery<OverviewData, Error>({
    queryKey: ["overview", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Utilisateur non connecté");
      const response = await fetch("/api/store/overview");
      if (!response.ok) throw new Error("Erreur lors de la récupération des données");
      return response.json();
    },
    enabled: !!userId && status === "authenticated",
    staleTime: 5 * 60 * 1000,
    initialData,
  });

  return {
    data: overviewQuery.data,
    isLoading: overviewQuery.isLoading || status === "loading",
    error: overviewQuery.error,
  };
}