"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent as DialogContentBase,
  DialogHeader,
  DialogTitle as DialogTitleBase,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  ArrowUpDown,
} from "lucide-react";
import { useSearch } from "@/features/search/hooks/use-search";
import { SearchParams, SearchResult, Product, SearchFilters } from "@/lib/db/search.engine";
import {
  getAllCategories,
  getAllPromotions,
} from "@/features/products/api/queries";
import CreateProductForm from "./CreateProductForm";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters"; // Ajout de ProductFilters
import { format } from "date-fns";
import { Badge } from "../../shared/Badge";
import { TableSkeleton } from "./TableSkeleton";

interface ProductTableProps {
  initialProducts: SearchResult;
  storeId: number;
}

export default function ProductTable({
  initialProducts,
  storeId,
}: ProductTableProps) {

  const initialParams: SearchParams = {
    filters: { storeId },
    pagination: { limit: 5, cursor: null },
    sort: "newest",
    useCache: false,
  };

  const [searchParams, setSearchParams] = useState<SearchParams>(initialParams);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading, error } = useSearch(
    searchParams,
    initialProducts,
    refreshKey
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const itemsPerPage = 5;

  useEffect(() => {
    const loadData = async () => {
      try {
        const promoData = await getAllPromotions();
        const catData = await getAllCategories();
        setPromotions(promoData || []);
        setCategories(catData || []);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setPromotions([]);
        setCategories([]);
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSort = (field: keyof Product | "stockLevel") => {
    let sortOption:
      | "price_asc"
      | "price_desc"
      | "newest"
      | "relevance"
      | "stock_desc" = "relevance";
    if (field === "price") {
      sortOption =
        searchParams?.sort === "price_asc" ? "price_desc" : "price_asc";
    } else if (field === "createdAt") {
      sortOption = "newest";
    } else if (field === "stockLevel") {
      sortOption = "stock_desc";
    }

    setSearchParams((prev) => ({
      ...prev,
      sort: sortOption,
      pagination: { limit: itemsPerPage, cursor: null },
    }));
  };

  const handlePageChange = () => {
    if (data.nextCursor && !isLoading) {
      setSearchParams((prev) => ({
        ...prev,
        pagination: {
          limit: itemsPerPage,
          cursor: data.nextCursor,
        },
      }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        const response = await fetch(
          `/api/products?productId=${productToDelete.id}&storeId=${storeId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          throw new Error("Échec de la suppression du produit");
        }

        setSearchParams((prev) => ({
          ...prev,
          pagination: { limit: itemsPerPage, cursor: null },
        }));
        setRefreshKey((prev) => prev + 1);
        setProductToDelete(null);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const handleProductCreatedOrUpdated = (newProductId?: number) => {
    setRefreshKey((prev) => prev + 1);
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    if (newProductId) {
      const newProduct = data.products.find((p) => p.id === newProductId);
      setSelectedProduct(newProduct || null);
      if (!isEditDialogOpen && newProduct) {
        setIsEditDialogOpen(true);
      }
    }
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setSearchParams((prev) => ({
      ...prev,
      filters: { storeId, ...newFilters },
      pagination: { limit: itemsPerPage, cursor: null },
    }));
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold ">
          Produits
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="w-full cursor-pointer sm:w-auto bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContentBase>
            <DialogHeader>
              <DialogTitleBase>Formulaire de produit</DialogTitleBase>
            </DialogHeader>
            <CreateProductForm
              storeId={storeId}
              promotions={promotions}
              categories={categories}
              onSuccess={handleProductCreatedOrUpdated}
            />
          </DialogContentBase>
        </Dialog>
      </div>

      <ProductFilters
        storeId={storeId}
        initialProducts={initialProducts}
        categories={categories}
        onFilterChange={handleFilterChange} // Nouvelle prop pour gérer les filtres
      />

      {(isLoading || isDataLoading) && (
        <Card className="shadow-sm">
          <CardContent className="px-4">
            <TableSkeleton />
          </CardContent>
        </Card>
      )}

      {!isLoading && !isDataLoading && error && (
        <p className="text-red-500">Erreur : {error}</p>
      )}

      {!isLoading && !isDataLoading && !error && (
        <Card className="shadow-sm">
          <CardContent className="px-4">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                      >
                        Nom <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">
                      Catégorie
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("price")}
                      >
                        Prix <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("stockLevel")}
                      >
                        Status <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("weight")}
                      >
                        Stock <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("createdAt")}
                      >
                        Créé le <ArrowUpDown className="h-4 w-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.length > 0 ? (
                    data.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="text-xs sm:text-sm font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                          {product.categories?.[0]?.name ?? "Non catégorisé"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {product.price.toLocaleString()} GNF
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                          <Badge
                            variant={
                              product.stockStatus === "in_stock"
                                ? "success"
                                : "warning"
                            }
                          >
                            {product.stockStatus === "in_stock"
                              ? "En stock"
                              : "Épuisé"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                          {product.stock?.availableStock} /{" "}
                          {product.stock?.stockLevel}{" "}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                          {product.createdAt
                            ? format(new Date(product.createdAt), "dd/MM/yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsDetailsDialogOpen(true);
                              }}
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setProductToDelete(product);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-gray-500 py-4"
                      >
                        Aucun produit trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="block sm:hidden space-y-4 p-4">
              {data.products.length > 0 ? (
                data.products.map((product) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium">{product.name}</h3>
                        <p className="text-xs text-gray-600">
                          {product.price.toLocaleString()} GNF
                        </p>
                        <p className="text-xs text-gray-500">
                          Poids: {product.weight} g
                        </p>
                        <p className="text-xs text-gray-500">
                          Stock: {product.stock?.stockLevel ?? "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDetailsDialogOpen(true);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setProductToDelete(product);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-center text-sm text-gray-500">
                  Aucun produit trouvé
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.nextCursor && !isLoading && (
        <div className="w-full flex justify-center mt-4 gap-2 items-center">
          <Button
            onClick={handlePageChange}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="bg-gray-100 hover:bg-gray-200"
          >
            Charger plus
          </Button>
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContentBase className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitleBase>
              Visualisation du produit : {selectedProduct?.name}
            </DialogTitleBase>
          </DialogHeader>
          {selectedProduct && (
            <ProductCard product={selectedProduct} storeId={storeId} />
          )}
        </DialogContentBase>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContentBase className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitleBase>Formulaire de produit</DialogTitleBase>
          </DialogHeader>
          {selectedProduct && (
            <CreateProductForm
              storeId={storeId}
              promotions={promotions}
              categories={categories}
              initialData={selectedProduct}
              onSuccess={handleProductCreatedOrUpdated}
            />
          )}
        </DialogContentBase>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContentBase>
          <DialogHeader>
            <DialogTitleBase>Confirmer la suppression</DialogTitleBase>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer {productToDelete?.name} ?</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Supprimer
            </Button>
          </div>
        </DialogContentBase>
      </Dialog>
    </div>
  );
}
