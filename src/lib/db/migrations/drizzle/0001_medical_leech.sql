-- Ajouter la colonne search_vector si elle n'existe pas encore
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Créer une fonction pour mettre à jour search_vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" := to_tsvector('french', NEW."name" || ' ' || COALESCE(NEW."description", ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour les insertions et mises à jour
DROP TRIGGER IF EXISTS trigger_update_search_vector ON "products";
CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE OF "name", "description"
ON "products"
FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Mettre à jour les lignes existantes
UPDATE "products"
SET "search_vector" = to_tsvector('french', "name" || ' ' || COALESCE("description", ''));

-- Ajouter l'index GIN
CREATE INDEX IF NOT EXISTS "products_search_vector_idx" ON "products" USING GIN("search_vector");