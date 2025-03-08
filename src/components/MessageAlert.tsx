"use client";

import { cn } from "@/lib/utils";
import { TriangleAlert, CheckCircle2 } from "lucide-react";
import { JSX } from "react";

interface MessageAlertProps {
    message: string | null;
    type: "error" | "success";
    className?: string;
}
interface MessageAlertProps {
  message: string | null;
  type: "error" | "success";
  className?: string;
}

export function MessageAlert({
  message,
  type,
  className,
}: MessageAlertProps): JSX.Element | null {
  if (!message || message.trim() === "") {
    return null;
  }

  const isError = type === "error";
  const backgroundColor = isError
    ? "rgba(239, 68, 68, 0.1)"
    : "rgba(34, 197, 94, 0.1)";
  const textColor = isError ? "#ef4444" : "#22c55e";

  return (
    <div
      className={cn(
        "w-full rounded-md flex items-center gap-2 text-sm",
        className
      )}
      style={{
        backgroundColor,
        color: textColor,
        padding: "0.5rem",
      }}
    >
      {isError ? (
        <TriangleAlert className="size-4" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      <p>{message}</p>
    </div>
  );
}
