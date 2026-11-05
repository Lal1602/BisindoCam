import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Isyarat — Penerjemah BISINDO",
    short_name: "Isyarat",
    description: "Penerjemah Bahasa Isyarat Indonesia (BISINDO) yang berjalan di peramban, juga tanpa internet.",
    start_url: "/id/translate",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#1e1b16",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
