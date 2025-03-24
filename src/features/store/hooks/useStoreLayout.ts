"use client";

import {
    useQuery,
    useMutation, useQueryClient
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { StoreLayoutData } from "../types";

export function useStoreLayout({ initialData }: { initialData: StoreLayoutData }) {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  const userId = session?.user?.id ? Number(session.user.id) : null;

  const layoutQuery = useQuery<StoreLayoutData, Error>({
    queryKey: ["storeLayout", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Utilisateur non connecté");
      const response = await fetch("/api/store/layout");
      if (!response.ok) throw new Error("Erreur lors de la récupération des données");
      return response.json();
    },
    enabled: !!userId && status === "authenticated",
    staleTime: 5 * 60 * 1000,
    initialData,
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Utilisateur non connecté");
      const response = await fetch("/api/store/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la mise à jour");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["storeLayout", userId] });
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.message || "Erreur lors de la mise à jour"),
  });

  return {
    data: layoutQuery.data,
    isLoading: layoutQuery.isLoading || status === "loading",
    error: layoutQuery.error,
    markNotificationsAsRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,
  };
}