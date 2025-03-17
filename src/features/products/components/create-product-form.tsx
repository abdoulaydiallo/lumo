// @/features/products/components/create-product-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProduct, updateProduct } from "@/features/products/api/actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Upload from "@/components/Upload";
import {
  Product,
  ProductCategory,
  Promotion,
} from "@/features/products/api/types";

const productSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(255),
  price: z.number().int().min(0, "Le prix doit être positif"),
  weight: z.number().int().min(0, "Le poids doit être positif"),
  description: z.string().optional(),
  imageUrls: z.array(z.string().url("URL invalide")).optional(),
  variantType: z.string().min(1, "Type de variante requis").max(50).optional(),
  variantValue: z
    .string()
    .min(1, "Valeur de variante requise")
    .max(50)
    .optional(),
  variantPrice: z
    .number()
    .int()
    .min(0, "Prix de variante doit être positif")
    .optional(),
  variantStock: z.number().int().min(0, "Stock doit être positif").optional(),
  categoryId: z.number().int().min(1, "Catégorie invalide").optional(),
  promotionId: z.number().int().min(1, "Promotion invalide").optional(),
  stockLevel: z.number().int().min(0, "Le stock doit être positif"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  storeId: number;
  categories: ProductCategory[];
  promotions: Promotion[];
  initialData?: Product;
}

export default function CreateProductForm({
  storeId,
  categories,
  promotions,
  initialData,
}: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!initialData;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          price: initialData.price,
          weight: initialData.weight,
          description: initialData.description || "",
          imageUrls: initialData.images.map((img) => img.imageUrl),
          variantType: initialData.variants[0]?.variantType || "",
          variantValue: initialData.variants[0]?.variantValue || "",
          variantPrice: initialData.variants[0]?.price || 0,
          variantStock: initialData.variants[0]?.stock || 0,
          categoryId: initialData.categories[0]?.id,
          promotionId: initialData.promotions[0]?.promotion.id,
          stockLevel: initialData.stock?.stockLevel || 0,
        }
      : {
          name: "",
          price: 0,
          weight: 10,
          description: "",
          imageUrls: [],
          variantType: "",
          variantValue: "",
          variantPrice: 0,
          variantStock: 0,
          categoryId: undefined,
          promotionId: undefined,
          stockLevel: 0,
        },
  });

  const onSubmit = async (data: ProductFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "imageUrls") {
        formData.append(key, JSON.stringify(value || []));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    try {
      if (isEditing && initialData?.id) {
        await updateProduct(initialData.id, storeId, formData);
        router.push(
          `/marketplace/stores/${storeId}/products/${initialData.id}`
        );
      } else {
        await createProduct(storeId, formData);
        router.push(`/marketplace/stores/${storeId}/products`);
      }
    } catch{
      setError(
          `Une erreur est survenue lors de la ${
            isEditing ? "mise à jour" : "création"
          } du produit.`
      );
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du produit</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Huawei Y6 2019" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix (GNF)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex. 750000"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poids (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex. 150"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stockLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Niveau de stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex. 20"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex. Le Huawei Y6 2019 est un smartphone d'entrée de gamme..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Images du produit</FormLabel>
              <FormControl>
                <Upload
                  value={field.value || []}
                  onChange={field.onChange}
                  maxFiles={5}
                  maxSize={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Variante (optionnel)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="variantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type (ex. Couleur)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Couleur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variantValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur (ex. Noir)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Noir" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="variantPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (GNF)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex. 750000"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variantStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex. 10"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie (optionnel)</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value ? Number(value) : undefined)
                }
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie (optionnel)</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value ? Number(value) : undefined)
                }
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une promotion" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {promotions.map((promotion) => (
                    <SelectItem key={promotion.id} value={String(promotion.id)}>
                      {promotion.code} - {promotion.discountPercentage}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <p className="text-destructive">{error}</p>}
        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? isEditing
              ? "Mise à jour..."
              : "Création..."
            : isEditing
            ? "Mettre à jour le produit"
            : "Créer le produit"}
        </Button>
      </form>
    </Form>
  );
}
