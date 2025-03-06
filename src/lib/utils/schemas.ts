import { z } from "zod";

// Schéma pour la connexion
export const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

// Schéma pour l'inscription
export const registerSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  name: z.string().min(1, { message: "Le nom est requis" }),
  role: z.enum(["user", "store", "driver", "admin", "manager"], {
    message: "Rôle invalide",
  }),
 phoneNumber: z.string()
  .regex(/^\+?\d{9,15}$/, { message: "Numéro de téléphone invalide (9-15 chiffres, + optionnel)" })
});