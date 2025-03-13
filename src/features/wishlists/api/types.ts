import { wishlists } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Wishlist = InferSelectModel<typeof wishlists>;