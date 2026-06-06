import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA → se sirve en /manifest.webmanifest.
 * Hace que "Plata" se pueda instalar como app en el celu o la compu.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plata — tus finanzas",
    short_name: "Plata",
    description: "Registrá gastos e ingresos en 2 toques. Privado y gratis.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0a16",
    theme_color: "#0d0a16",
    lang: "es-AR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
