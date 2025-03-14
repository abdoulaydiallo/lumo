"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {Chrome } from "lucide-react";
import { registerSchema } from "@/lib/utils/schemas";
import { MessageAlert } from "../MessageAlert";
import Link from "next/link";

interface RegisterFormProps extends React.ComponentPropsWithoutRef<"div"> {}

export function RegisterForm({ className, ...props }: RegisterFormProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
      phoneNumber: "",
    },
  });
  const handleSubmit = (values: z.infer<typeof registerSchema>) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const { error } = await response.json();
          setError(error || "Échec de l'inscription");
        } else {
          setSuccess(
            "Inscription réussie. Vérifiez votre email pour activer votre compte."
          );
        }
      } catch (err) {
        setError("Erreur inattendue. Veuillez réessayer.");
        console.error("Erreur lors de l'inscription:", err);
      }
    });
  };

  const handleGoogleSignIn = () => {
    startTransition(() => {
      signIn("google", { callbackUrl: "/marketplace" });
    });
  };

  return (
    <div
      className={cn("flex flex-col gap-2 overflow-auto", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inscription</CardTitle>
          <CardDescription>
            Créez un compte avec Google ou vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isPending}
          >
            <Chrome className="w-5 h-5" />
            {isPending ? "Inscription en cours..." : "S'inscrire avec Google"}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou
              </span>
            </div>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom complet"
                        disabled={isPending}
                        {...field}
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
                        placeholder="contact@example.com"
                        type="email"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="+224-6xx-xxx-xxx"
                        type="tel"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="**********"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Utilisateur</SelectItem>
                        <SelectItem value="store">Vendeur</SelectItem>
                        <SelectItem value="driver">Livreur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <MessageAlert message={error} type="error" />}
              {success && (
                <div className="space-y-4">
                  <MessageAlert message={success} type="success" />
                  <Button asChild className="w-full">
                    <Link href="/login">Retour à la connexion</Link>
                  </Button>
                </div>
              )}
              {!success && (
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Inscription en cours..." : "S'inscrire"}
                </Button>
              )}
            </form>
          </Form>
          {!success && (
            <div className="text-center text-sm">
              Déjà un compte ?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Se connecter
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
