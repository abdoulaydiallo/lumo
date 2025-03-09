CREATE TABLE "product_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"stock_level" integer NOT NULL,
	"reserved_stock" integer DEFAULT 0 NOT NULL,
	"available_stock" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;