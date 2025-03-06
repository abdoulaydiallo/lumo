"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Token de vérification manquant");
      setIsPending(false);
      return;
    }

    const verifyAccount = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const { error } = await response.json();
          setError(error || "Échec de la vérification");
        } else {
          setMessage(
            "Compte vérifié avec succès ! Redirection vers la connexion..."
          );
          setTimeout(() => router.push("/login"), 2000);
        }
      } catch (err) {
        setError("Erreur inattendue. Veuillez réessayer.");
        console.error("Erreur lors de la vérification:", err);
      } finally {
        setIsPending(false);
      }
    };

    verifyAccount();
  }, [token, router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Vérification du compte</CardTitle>
          <CardDescription>
            Validation de votre inscription en cours...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPending && (
            <p className="text-center text-muted-foreground">
              Vérification en cours...
            </p>
          )}
          {message && (
            <p className="text-green-500 text-sm text-center">{message}</p>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {!isPending && !error && (
            <Button asChild className="w-full">
              <Link href="/login">Aller à la connexion</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
