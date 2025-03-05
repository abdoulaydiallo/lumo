import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "./lib/db";
import { users, accounts, sessions, verificationTokens } from "./lib/schema";
import { comparePassword } from "./lib/utils";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

class InvalidLoginError extends CredentialsSignin {
  code = "Invalid email or password"
}

export const { auth, handlers } = NextAuth({
  // @ts-ignore
  adapter: DrizzleAdapter(db, {// @ts-ignore
    usersTable: users, // @ts-ignore
    accountsTable: accounts,// @ts-ignore
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new InvalidLoginError();
        }

        try {
          const [user] = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              password: users.password,
              role: users.role,
              status: users.status,
            })
            .from(users)
            .where(eq(users.email, String(credentials.email)))
            .limit(1);

          if (!user) {
            throw new Error("Utilisateur non trouvé");
          }

          if (user.status !== "active") {
            throw new Error("Votre compte est inactif ou en attente de validation");
          }

          if (!user.password) {
            throw new Error("Ce compte utilise une connexion via un autre fournisseur (ex. Google)");
          }
          
          const isValid = await comparePassword(String(credentials.password), user.password as string);
          if (!isValid) {
            throw new InvalidLoginError();
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error instanceof InvalidLoginError ? error : new Error("Authentication failed");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as "user" | "store" | "driver" | "admin" | "manager";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          role: token.role as "user" | "store" | "driver" | "admin" | "manager",
        };
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const [existingUser] = await db
          .select({ id: users.id, role: users.role, status: users.status, password: users.password })
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);
        
        if (existingUser) {
          if (existingUser.password) {
              throw new Error("Cet email est déjà associé à un compte avec mot de passe. Utilisez la connexion par email.");
            }
            if (existingUser.status !== "active") {
            throw new Error("Votre compte est inactif ou en attente de validation");
          }
        }else {
          // Nouvel utilisateur via Google : définir un rôle par défaut
          const [newUser] = await db
            .insert(users)
            .values({
              email: user.email!,
              name: user.name ?? "Utilisateur Google",
              role: "user", // Rôle par défaut, ajustable
              status: "active",
              phoneNumber: "+224600101010", // Placeholder, à ajuster
            })
            .returning({ id: users.id });

          await db.insert(accounts).values({
            userId: newUser.id,
            type: "oauth",
            provider: "google",
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            expiresAt: account.expires_at,
            refreshToken: account.refresh_token,
            tokenType: account.token_type,
            scope: account.scope,
            idToken: account.id_token,
          });
        }
      }
      return true; // Autorise la connexion
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith("/") ? `${baseUrl}${url}` : url;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});