import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const clientRoot = path.resolve(import.meta.dirname, "client");

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, clientRoot, "");
  if (mode === "production" && !env.VITE_META_PIXEL_ID?.trim()) {
    throw new Error(
      "VITE_META_PIXEL_ID is required for production builds. Configure it in the deployment environment."
    );
  }

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: clientRoot,
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      target: "es2015",
    },
  };
});
