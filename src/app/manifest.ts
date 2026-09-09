import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grupo 612 — Plataforma Administrativa",
    short_name: "Grupo 612",
    description: "Plataforma administrativa y financiera de Grupo 612",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F4F8F6",
    theme_color: "#3AAF85",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
