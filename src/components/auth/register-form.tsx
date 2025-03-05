"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Chrome } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(["user", "store", "driver", "admin", "manager"], {
    required_error: "Veuillez sélectionner un rôle",
  }),
  phoneNumber: z
    .string()
    .min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres"),
});

interface RegisterFormProps extends React.ComponentPropsWithoutRef<"div"> {}

export function RegisterForm({ className, ...props }: RegisterFormProps) {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [isPendingSubmit, startSubmitTransition] = useTransition();
  const [isPendingGoogle, startGoogleTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
      phoneNumber: "",
    },
  });
const handleSubmit = (values: z.infer<typeof formSchema>) => {
    startSubmitTransition(async () => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        signIn("credentials", {
          email: values.email,
          password: values.password,
          callbackUrl: getRedirectPath(values.role),
        });
      } else {
        const { error } = await response.json();
        router.push(`/auth/error?error=RegistrationFailed&error_description=${encodeURIComponent(error || "Échec de l'inscription")}`);
      }
    });
  };

  const handleGoogleSignIn = () => {
    startGoogleTransition(() => {
      signIn("google", { callbackUrl: "/marketplace" });
    });
  };

  const getRedirectPath = (role: string) => {
    return (
      role === "store" ? "/dashboard/store" :
      role === "driver" ? "/dashboard/driver" :
      role === "admin" || role === "manager" ? "/dashboard/admin" :
      "/marketplace"
    );
  };
  
  return (
    <div className={cn("flex flex-col gap-2 overflow-auto", className)} {...props}>
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
            disabled={isPendingGoogle || isPendingSubmit}
          >
            <Chrome className="w-5 h-5" />
            {isPendingGoogle
              ? "Inscription en cours..."
              : "S'inscrire avec Google"}
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
                        disabled={isPendingSubmit || isPendingGoogle}
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
                        disabled={isPendingSubmit || isPendingGoogle}
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
                        disabled={isPendingSubmit || isPendingGoogle}
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
                        disabled={isPendingSubmit || isPendingGoogle}
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
                      disabled={isPendingSubmit || isPendingGoogle}
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
              <Button
                type="submit"
                className="w-full"
                disabled={isPendingSubmit || isPendingGoogle}
              >
                {isPendingSubmit ? "Inscription en cours..." : "S'inscrire"}
              </Button>
            </form>
          </Form>
          <div className="text-center text-sm">
            Déjà un compte ?{" "}
            <a href="/auth/login" className="underline underline-offset-4">
              Se connecter
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
