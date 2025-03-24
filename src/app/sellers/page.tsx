// app/sellers/page.tsx
import Overview from "@/components/dashboard/Overview";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  stores,
  orders,
  products,
  productStocks,
  storeDocuments,
} from "@/lib/db/schema";

export default async function SellersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  const userStores = await db
    .select()
    .from(stores)
    .where(eq(stores.userId, userId));
  const storeIds = userStores.map((store) => store.id);

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId));
  const userProducts = await db
    .select()
    .from(products)
    .where(
      storeIds.length > 0
        ? and(...storeIds.map((id) => eq(products.storeId, id)))
        : eq(products.storeId, -1)
    );
  const userProductStocks = await db
    .select()
    .from(productStocks)
    .where(
      userProducts.length > 0
        ? and(...userProducts.map((p) => eq(productStocks.productId, p.id)))
        : eq(productStocks.productId, -1)
    );
  const userStoreDocuments = await db
    .select()
    .from(storeDocuments)
    .where(
      storeIds.length > 0
        ? and(...storeIds.map((id) => eq(storeDocuments.storeId, id)))
        : eq(storeDocuments.storeId, -1)
    );

  const totalOrders = userOrders.length;
  const pendingOrders = userOrders.filter((o) => o.status === "pending").length;
  const revenue = userProducts.reduce((sum, p) => {
    const deliveredOrders = userOrders.filter(
      (o) => o.status === "delivered"
    ).length;
    return deliveredOrders > 0
      ? sum + p.price * (deliveredOrders / userProducts.length)
      : sum;
  }, 0);
  const lowStockItems = userProductStocks.filter(
    (ps) => ps.availableStock < 5
  ).length;

  const initialData = {
    orders: userOrders,
    products: userProducts,
    productStocks: userProductStocks,
    storeDocuments: userStoreDocuments,
    metrics: {
      totalOrders,
      pendingOrders,
      revenue,
      lowStockItems,
    },
  };

  return <Overview initialData={initialData} />;
}
