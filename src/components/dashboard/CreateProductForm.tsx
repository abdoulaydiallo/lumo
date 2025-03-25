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
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  initialData?: Product | any;
  onSuccess?: () => void;
}

export default function CreateProductForm({
  storeId,
  categories,
  promotions,
  initialData,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!initialData;
  const totalSteps = 5;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          price: initialData.price,
          weight: initialData.weight,
          description: initialData.description || "",
          imageUrls: initialData.images?.map((img) => img.imageUrl) || [],
          variantType: initialData.variants?.[0]?.variantType || "",
          variantValue: initialData.variants?.[0]?.variantValue || "",
          variantPrice: initialData.variants?.[0]?.price || 0,
          variantStock: initialData.variants?.[0]?.stock || 0,
          categoryId: initialData.categories?.[0]?.id,
          promotionId: initialData.promotions?.[0]?.promotion.id,
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

  const getStepSchema = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return z.object({
          name: productSchema.shape.name,
          price: productSchema.shape.price,
          weight: productSchema.shape.weight,
          stockLevel: productSchema.shape.stockLevel,
        });
      case 2:
        return z.object({
          description: productSchema.shape.description,
        });
      case 3:
        return z.object({
          variantType: productSchema.shape.variantType,
          variantValue: productSchema.shape.variantValue,
          variantPrice: productSchema.shape.variantPrice,
          variantStock: productSchema.shape.variantStock,
        });
      case 4:
        return z.object({
          categoryId: productSchema.shape.categoryId,
          promotionId: productSchema.shape.promotionId,
        });
      case 5:
        return z.object({
          imageUrls: productSchema.shape.imageUrls,
        });
      default:
        return productSchema;
    }
  };

  const handleNext = async () => {
    const partialSchema = getStepSchema(step);
    try {
      await partialSchema.parseAsync(form.getValues());
      setError(null);
      if (step < totalSteps) {
        setStep((prev) => prev + 1);
      } else {
        await onSubmit(form.getValues());
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) =>
          form.setError(e.path[0] as any, { message: e.message })
        );
      }
    }
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

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
      let success = false;
      if (isEditing && initialData?.id) {
        await updateProduct(initialData.id, storeId, formData);
        success = true;
      } else {
        await createProduct(storeId, formData);
        success = true;
      }

      if (success) {
        router.refresh(); // Ensure page is revalidated
        if (onSuccess) {
          console.log("Calling onSuccess after successful operation");
          onSuccess(); // Call onSuccess only after successful operation
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Erreur lors de la soumission:", errorMessage);
      setError(
        `Une erreur est survenue lors de la ${
          isEditing ? "mise à jour" : "création"
        } du produit: ${errorMessage}`
      );
    }
  };

  const stepTitles = [
    "Informations de base",
    "Description",
    "Variantes",
    "Catégorie & Promotion",
    "Images",
  ];

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {isEditing ? "Modifier le produit" : "Créer un produit"}
        </h2>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{stepTitles[step - 1]}</span>
          <span>
            Étape {step} sur {totalSteps}
          </span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="mt-2" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="space-y-6 pt-6">
              {step === 1 && (
                <>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
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
                          <FormLabel>Stock</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex. 20"
                              {...field}
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
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
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Variante (optionnel)
                  </p>
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
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
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
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <SelectItem
                                key={category.id}
                                value={String(category.id)}
                              >
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
                    name="promotionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion (optionnel)</FormLabel>
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
                              <SelectItem
                                key={promotion.id}
                                value={String(promotion.id)}
                              >
                                {promotion.code} -{" "}
                                {promotion.discountPercentage}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 5 && (
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
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || form.formState.isSubmitting}
              className="w-32"
            >
              Précédent
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={form.formState.isSubmitting}
              className="w-32 bg-primary hover:bg-primary/90"
            >
              {form.formState.isSubmitting
                ? isEditing
                  ? "Mise à jour..."
                  : "Création..."
                : step === totalSteps
                ? isEditing
                  ? "Mettre à jour"
                  : "Créer"
                : "Suivant"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
