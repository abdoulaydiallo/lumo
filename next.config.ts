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
    ],
  },
};

export default nextConfig;
