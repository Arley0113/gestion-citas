import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "sena-logo.png"],
      manifest: {
        name: "Bienestar SENA — Sistema de citas",
        short_name: "Bienestar SENA",
        description: "Agendamiento y gestión de citas para el área de Bienestar del SENA",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#39a900",
        background_color: "#0d1117",
        icons: [
          { src: "/pwa-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin.includes("fonts.googleapis.com") || url.origin.includes("fonts.gstatic.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
  },
});
