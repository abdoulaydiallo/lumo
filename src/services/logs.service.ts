import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export interface AuditLogData {
    userId: number;
    action: string;
    actions: Record<string, any>;
  }
  
  export interface AuditLog extends AuditLogData {
    id: number;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
 * Enregistre une activité dans les logs d'audit.
 * @param userId - ID de l'utilisateur effectuant l'action.
 * @param action - L'action effectuée (par exemple, "login", "order_create").
 * @param details - Les détails de l'action (par exemple, les données modifiées).
 */
export const logActivity = async (userId: number | null, action: string, details: any) => {
    try {
      await db.insert(auditLogs).values({
        userId,
        action,
        details,
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };