"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageAlert } from "@/components/MessageAlert";
import Upload from "@/components/Upload";

interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  phoneNumber: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    phoneNumber: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Échec de la récupération du profil");
      }
      const data: UserProfile = await response.json();
      setUser(data);
      setFormData({
        name: data.name || "",
        image: data.image || "",
        phoneNumber: data.phoneNumber || "",
      });
      setImagePreview(data.image || null);
    } catch (error) {
      setMessage({
        text: "Erreur lors de la récupération du profil",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (urls: string[]) => {
    setFormData((prev) => ({ ...prev, image: urls[0] }));
    setImagePreview(urls[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Échec de la mise à jour");
      }

      const { user: updatedUser } = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
      setMessage({ text: "Profil mis à jour avec succès", type: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Erreur inattendue",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || status === "loading") {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 w-full sm:w-auto">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !user) {
    return null; // Redirection gérée par useEffect
  }

  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto shadow-sm rounded-xl transition-all duration-300 hover:shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl font-bold text-primary">
            Profile
          </CardTitle>
          <CardDescription className="text-muted-foreground mb-4">
            Gérez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Avatar et infos */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20 transition-transform duration-300 hover:scale-105">
              <AvatarImage
                src={user.image || ""}
                alt={user.name || "Utilisateur"}
              />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <p className="text-xl font-semibold text-foreground">
                {user.name || "Utilisateur"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Formulaire ou affichage */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nom
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Votre nom"
                  className="rounded-md shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Upload
                  onChange={(urls) => handleImageUpload(urls[0] as any)} // Prend la première URL
                  maxSize={5}
                  maxFiles={1} // Limite à 1 pour profileImageUrl
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  Numéro de téléphone
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+224620101010"
                  className="rounded-md shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Email (non modifiable)
                </Label>
                <Input value={user.email} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Rôle (non modifiable)
                </Label>
                <Input
                  value={user.role}
                  disabled
                  className="bg-muted/50 capitalize"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto rounded-md py-2 transition-all duration-200 hover:shadow-md"
                >
                  {isLoading ? "Mise à jour..." : "Enregistrer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                  className="w-full sm:w-auto rounded-md py-2 transition-all duration-200 hover:shadow-md"
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Rôle</Label>
                <p className="text-sm text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Numéro de téléphone
                </Label>
                <p className="text-sm text-muted-foreground">
                  {user.phoneNumber || "Non défini"}
                </p>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto rounded-md py-2 transition-all duration-200 hover:shadow-md hover:bg-primary/90"
              >
                Modifier le profil
              </Button>
            </div>
          )}

          {message && (
            <MessageAlert
              message={message.text}
              type={message.type}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
