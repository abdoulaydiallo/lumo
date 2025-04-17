import Navbar from "@/components/navbar/Navbar";
import { SearchProvider } from "@/contexts/SearchContext";

export default function LayoutLandingMarketplace({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SearchProvider>
      <Navbar logo="Marketplace" />
      <div>{children}</div>
    </SearchProvider>
  );
}
