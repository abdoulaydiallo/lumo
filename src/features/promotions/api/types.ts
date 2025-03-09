import { promotions } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Promotion = InferSelectModel<typeof promotions>;