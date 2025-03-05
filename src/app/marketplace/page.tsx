import { AppNavbar } from "@/components/AppNavbar";

/**
 * Page de tableau de bord pour les utilisateurs avec le rôle "store"
 * @returns {JSX.Element} Contenu du tableau de bord
 */
export default function StoreDashboard() {
  return (
    <div className="">
      <AppNavbar />
      <div className="container mx-auto p-6">
        <p className="mt-4">Bienvenue dans votre espace user.</p>
      </div>
    </div>
  );
}
