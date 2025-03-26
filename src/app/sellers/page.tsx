import Overview from "@/components/dashboard/Overview";
import { getOverviewDataByUserId } from "@/services/overview.service";

export const revalidate = 0; // Désactiver le cache statique

export default async function SellersPage() {
 
  const initialData = await getOverviewDataByUserId(5);
  
  return <Overview initialData={initialData} />;
}
