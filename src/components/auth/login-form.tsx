"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Chrome } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Veuillez entrer un email valide"),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/marketplace";
  const [isPendingSubmit, startSubmitTransition] = useTransition();
  const [isPendingGoogle, startGoogleTransition] = useTransition();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    startSubmitTransition(() => {
      signIn("credentials", {
        email: values.email,
        password: values.password,
        callbackUrl,
      });
    });
  };

  const handleGoogleSignIn = () => {
    startGoogleTransition(() => {
      signIn("google", { callbackUrl });
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte avec Google ou vos identifiants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isPendingGoogle || isPendingSubmit}
          >
            <Chrome className="w-5 h-5" />
            {isPendingGoogle
              ? "Connexion en cours..."
              : "Se connecter avec Google"}
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
              onSubmit={form.handleSubmit(handleLoginSubmit)}
              className="space-y-4"
            >
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Mot de passe</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
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
              <Button
                type="submit"
                className="w-full"
                disabled={isPendingSubmit || isPendingGoogle}
              >
                {isPendingSubmit ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </form>
          </Form>
          <div className="text-center text-sm">
            Pas de compte ?{" "}
            <a href="/auth/register" className="underline underline-offset-4">
              S'inscrire
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
