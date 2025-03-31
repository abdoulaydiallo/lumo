// errors.ts
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ServiceError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Codes d'erreur standardisés
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  DATABASE_ERROR: "DATABASE_ERROR",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;