"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Messages personnalisés selon le type d'erreur
  const errorMessages: Record<string, string> = {
    CredentialsSignin:
      "Email ou mot de passe invalide. Veuillez vérifier vos identifiants.",
    AccessDenied:
      "Accès refusé : votre compte n'est pas autorisé. Contactez l'administrateur.",
    OAuthSignin:
      "Erreur lors de la connexion avec Google. Réessayez ou utilisez un autre méthode.",
    OAuthCallback:
      "Erreur dans le callback Google. Veuillez réessayer plus tard.",
    default: "Email ou mot de pass invalide",
  };

  const displayError = error
    ? errorMessages[error] ||
      searchParams.get("error_description") ||
      errorMessages.default
    : errorMessages.default;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-center">
            Erreur d'authentification
          </CardTitle>
          <CardDescription className="text-center">
            Un problème est survenu lors de votre connexion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message d'erreur */}
          <div className="text-center">
            <p className="text-red-500 text-sm">{displayError}</p>
          </div>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Action
              </span>
            </div>
          </div>

          {/* Bouton de retour */}
          <Button asChild className="w-full" variant="default">
            <Link href="/auth/login">Retourner à la connexion</Link>
          </Button>

          {/* Lien supplémentaire */}
          <div className="text-center text-sm text-muted-foreground">
            Besoin d'aide ?{" "}
            <a
              href="/support"
              className="underline underline-offset-4 hover:text-primary"
            >
              Contacter le support
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
