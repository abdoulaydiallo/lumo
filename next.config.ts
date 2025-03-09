import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "", // Laisser vide si pas de port spécifique
        pathname: "/**", // Autoriser tous les chemins sous ce domaine
      },
      {
        protocol: "https",
        hostname: "prd.place",
        port: "",
        pathname: "/**",
      }
    ],
  },
};

export default nextConfig;
