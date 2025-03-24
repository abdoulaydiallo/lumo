// @/features/store/api/actions.ts
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notifications } from "@/lib/db/schema";

export async function markNotificationsAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ status: "read" })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, "unread")));
  return { message: "Notifications marquées comme lues" };
}