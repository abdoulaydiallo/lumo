import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Gestion des erreurs sans process.exit
pool.on("error", (err: Error) => {
  console.error("Erreur inattendue sur le client PostgreSQL:", err);
  // Ne pas utiliser process.exit dans Edge Runtime
  // Lancer une exception ou laisser l'appelant gérer l'erreur
});

// Initialisation de Drizzle ORM
export const db = drizzle(pool, { schema });