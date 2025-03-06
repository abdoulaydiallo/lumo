import { eq } from "drizzle-orm";
import { db } from "../db";
import { comparePassword } from "../utils";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { users, accounts, sessions, verificationTokens } from "../db/schema";

class InvalidLoginError extends CredentialsSignin {
  code = "Invalid email or password";
}

export const { auth, handlers } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens,
  }) as any,
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
              image: users.image,
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
            id: String(user.id),
            email: user.email,
            name: user.name ?? null,
            role: user.role,
            image: user.image ?? null,
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
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as never;
        session.user.role = token.role as "user" | "store" | "driver" | "admin" | "manager";
        session.user.image = token.image as string | undefined;
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
        } else {
          const [newUser] = await db
            .insert(users)
            .values({
              email: user.email!,
              name: user.name ?? "Utilisateur Google",
              image: user.image ?? null, // Ajouter l'image Google
              role: "user",
              status: "active",
              phoneNumber: "620101010",
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
      return true;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith("/") ? `${baseUrl}${url}` : url;
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
});