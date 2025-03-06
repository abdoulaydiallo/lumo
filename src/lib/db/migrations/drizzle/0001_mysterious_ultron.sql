ALTER TABLE "verification_tokens" RENAME COLUMN "identifier" TO "id";--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;