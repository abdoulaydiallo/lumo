"use client";

import { useRouter } from "next/navigation";

interface IParams {
  title?: string;
}

export const Logo = ({ title }: IParams) => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/")}
      className="text-2xl font-bold text-primary hover:text-primary/90 transition-colors cursor-pointer"
    >
      {title}
    </div>
  );
};
