// @/features/stores/components/edit-store-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateStore } from "../api/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useTransition } from "react";
import { MessageAlert } from "@/components/MessageAlert";
import { Upload } from "@/components/Upload";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "../api/types";
import { useEffect } from "react";
import OpeningHoursManager from "./opening-hours-manager";

// Schéma Zod avec activityType optionnel pour les données existantes
const storeSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  phoneNumber: z.string().regex(/^\d{9,20}$/, "Numéro invalide"),
  email: z.string().email("Email invalide"),
  profileImageUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  description: z.string().optional(),
  activityType: z
    .enum([
      "Mode",
      "Électronique",
      "Alimentation",
      "Maison",
      "Beauté",
      "Sports",
      "Autres",
    ])
    .optional(), // Rendre optionnel pour les anciennes boutiques
  isOpenNow: z.boolean(),
  openingHours: z.any(), // À raffiner plus tard
});

type StoreFormValues = z.infer<typeof storeSchema>;

interface EditStoreFormProps {
  store: Store;
}

export default function EditStoreForm({ store }: EditStoreFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      profileImageUrl: "",
      coverImageUrl: "",
      description: "",
      activityType: undefined,
      isOpenNow: false,
      openingHours: {},
    },
  });

  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name || "",
        phoneNumber: store.phoneNumber || "",
        email: store.email || "",
        profileImageUrl: store.profileImageUrl || "",
        coverImageUrl: store.coverImageUrl || "",
        description: store.description || "",
        activityType: store.activityType || undefined,
        isOpenNow: store.isOpenNow || false,
        openingHours: store.openingHours || {},
      });
      setLoading(false);
    }
  }, [store, form]);

  const onSubmit = (data: StoreFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("phoneNumber", data.phoneNumber);
        formData.append("email", data.email);
        if (data.profileImageUrl)
          formData.append("profileImageUrl", data.profileImageUrl);
        if (data.coverImageUrl)
          formData.append("coverImageUrl", data.coverImageUrl);
        if (data.description) formData.append("description", data.description);
        if (data.activityType)
          formData.append("activityType", data.activityType);
        formData.append("isOpenNow", String(data.isOpenNow));
        formData.append("openingHours", JSON.stringify(data.openingHours));
        await updateStore(store.id, formData);
        setMessage({
          text: "Boutique mise à jour avec succès",
          type: "success",
        });
        form.reset(data);
      } catch (error) {
        const errorMessage =
          "Erreur lors de la mise à jour de la boutique";
        console.error("Erreur dans onSubmit:", error);
        setMessage({ text: errorMessage, type: "error" });
      }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl p-6">
        <Skeleton className="h-8 w-48 mx-auto mb-6" />
        <Card className="border border-border rounded-lg bg-background">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <Card className="border border-border rounded-lg bg-background">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-6 text-center">
            Modifier la boutique
          </h1>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la boutique</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ma Boutique"
                          {...field}
                          disabled={isPending}
                          className="border-border bg-background text-foreground rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d&apos;activité</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="border-border bg-background text-foreground rounded-md">
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Mode">Mode</SelectItem>
                          <SelectItem value="Électronique">
                            Électronique
                          </SelectItem>
                          <SelectItem value="Alimentation">
                            Alimentation
                          </SelectItem>
                          <SelectItem value="Maison">Maison</SelectItem>
                          <SelectItem value="Beauté">Beauté</SelectItem>
                          <SelectItem value="Sports">Sports</SelectItem>
                          <SelectItem value="Autres">Autres</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de téléphone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789"
                          {...field}
                          disabled={isPending}
                          className="border-border bg-background text-foreground rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="boutique@example.com"
                          {...field}
                          disabled={isPending}
                          className="border-border bg-background text-foreground rounded-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isOpenNow"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between border border-border rounded-md p-4">
                    <div>
                      <FormLabel>Ouvert maintenant</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Indiquez si votre boutique est actuellement ouverte
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-6">
                <h2 className="text-lg font-medium text-foreground">
                  Images de la boutique
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="profileImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image de profil</FormLabel>
                        <FormControl>
                          <Upload
                            onChange={(urls) => field.onChange(urls[0] || "")}
                            value={field.value ? [field.value] : []}
                            maxSize={5}
                            maxFiles={1}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image de couverture</FormLabel>
                        <FormControl>
                          <Upload
                            onChange={(urls) => field.onChange(urls[0] || "")}
                            value={field.value ? [field.value] : []}
                            maxSize={5}
                            maxFiles={1}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre boutique..."
                        {...field}
                        disabled={isPending}
                        className="border-border bg-background text-foreground rounded-md min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openingHours"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <OpeningHoursManager
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                      />
                    </svg>
                    Mise à jour...
                  </span>
                ) : (
                  "Mettre à jour la boutique"
                )}
              </Button>
            </form>
          </Form>
          {message && (
            <MessageAlert message={message.text} type={message.type} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
