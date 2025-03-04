// Importation des modules nécessaires depuis Drizzle ORM et pg
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Importation du schéma des tables (à créer dans schema.ts)
import * as schema from "./schema";

// Configuration de la connexion PostgreSQL avec Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_ONLINE_URL, // URL de connexion depuis .env.local
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // SSL activé en production
});

// Initialisation de Drizzle ORM avec le pool et le schéma
export const db = drizzle(pool, { schema });

// Gestion des erreurs de connexion (optionnel, pour robustesse)
pool.on("error", (err) => {
  console.error("Erreur inattendue sur le client PostgreSQL:", err);
  process.exit(-1); // Arrête l'application en cas d'erreur critique
});

// Exportation pour utilisation dans les Server Components ou API Routes
export default db;