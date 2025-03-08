import { cn } from "@/lib/utils";

interface HeadingProps {
  title: string;
  subtitle?: string;
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
}

export default function Heading({
  title,
  subtitle,
  level = "h1",
  className,
}: HeadingProps) {
  const Tag = level;

  return (
    <div className="my-4">
      <Tag className={cn("text-2xl font-bold text-foreground mb-2", className)}>
        {title}
      </Tag>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}
