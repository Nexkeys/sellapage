import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // esbuild's default minifier was mangling an identifier collision in the
  // production bundle (a genuine top-level component reference — e.g. `SEO`
  // used across many pages — got renamed at its declaration but left
  // unrenamed at some call sites, throwing "ReferenceError: X is not
  // defined" only in the minified build, never in dev or an unminified
  // build). Terser is the more battle-tested minifier and doesn't reproduce
  // this class of bug.
  build: {
    minify: "terser",
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "inline",
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Sellapage",
        short_name: "Sellapage",
        description: "Create your store. Take orders. Grow faster.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#16a34a",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5000000,
      },
    }),
  ],
});
