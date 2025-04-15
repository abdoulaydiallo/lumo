"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

interface IParams {
  title?: string;
}

export const Logo = ({ title }: IParams) => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/marketplace/products")}
      className="text-2xl font-bold text-primary hover:text-primary/90 transition-colors cursor-pointer flex items-center"
    >
      <Image alt="Logo" src="/logo.svg" width={40} height={40} className="inline-block" />
      {title && (<span className="cursor-pointer">{title}</span>)}
    </div>
  );
};
