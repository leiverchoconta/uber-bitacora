import type { MetadataRoute } from "next";

/** Enough to install on the phone's home screen. No service worker: online only. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitácora de ruta",
    short_name: "Bitácora",
    description: "Bitácora semanal de sesiones de conexión manejando Uber.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee1",
    theme_color: "#16403d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
