// @/features/promotions/components/promotion-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPromotion,
  updatePromotion,
} from "@/features/promotions/api/actions";
import { toast } from "sonner";

// Schéma de validation avec Zod
const promotionSchema = z
  .object({
    code: z
      .string()
      .min(1, "Le code est requis.")
      .max(50, "Le code ne peut pas dépasser 50 caractères."),
    discountPercentage: z
      .number({ invalid_type_error: "Le pourcentage doit être un nombre." })
      .min(0, "Le pourcentage doit être supérieur ou égal à 0.")
      .max(100, "Le pourcentage ne peut pas dépasser 100."),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message:
        "La date de fin doit être supérieure ou égale à la date de début.",
      path: ["endDate"],
    }
  );

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  storeId: number;
  promotionId?: number; // Optionnel pour création
  initialData?: Partial<PromotionFormValues>;
}

export default function PromotionForm({
  storeId,
  promotionId,
  initialData,
}: PromotionFormProps) {
  const router = useRouter();

  // Initialisation du formulaire avec react-hook-form et zod
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      code: initialData?.code || "",
      discountPercentage: initialData?.discountPercentage || 0,
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
    },
  });

  const onSubmit = async (data: PromotionFormValues) => {
    const formData = new FormData();
    formData.append("code", data.code);
    formData.append("discountPercentage", String(data.discountPercentage));
    if (data.startDate) formData.append("startDate", data.startDate);
    if (data.endDate) formData.append("endDate", data.endDate);

    try {
      if (promotionId) {
        await updatePromotion(promotionId, storeId, formData);
        toast("La promotion a été mise à jour avec succès.");
      } else {
        await createPromotion(storeId, formData);
        toast("La promotion a été créée avec succès.");
      }
      router.push(`/marketplace/stores/${storeId}/promotions`);
    } catch (error) {
      console.error("Erreur dans PromotionForm:", error);
      toast("Une erreur est survenue lors de l'enregistrement.", {
        style: { background: "red", color: "white" }, // Exemple de style pour erreur
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {promotionId ? "Modifier la promotion" : "Nouvelle promotion"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code de la promotion</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      placeholder="ex. REDUC20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pourcentage de réduction</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      disabled={form.formState.isSubmitting}
                      placeholder="ex. 20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de début</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Optionnelle</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de fin</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Optionnelle</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/marketplace/stores/${storeId}/promotions`)
                }
                disabled={form.formState.isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Enregistrement..."
                  : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
