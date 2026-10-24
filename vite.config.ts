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
      rollupOptions: {
        output: {
          // Keep the big third-party libraries in their own long-lived chunks so a change to app
          // code does not invalidate them, and so the landing page (which uses none of Firebase)
          // only downloads what it renders.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("/node_modules/firebase/") || id.includes("/node_modules/@firebase/")) {
              return "firebase";
            }
            if (id.includes("/node_modules/framer-motion/")) return "framer-motion";
            if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) {
              return "react";
            }
            // All Radix primitives share one chunk. They used to be split into an eager
            // "radix-base" and a lazy "radix" chunk, but once the shared site header made the
            // dialog (mobile menu) eager the two chunks imported each other and the bundle threw
            // "is not a function" at load, blanking every page. One chunk has no such cycle.
            if (id.includes("/node_modules/@radix-ui/")) return "radix";
            return undefined;
          },
        },
      },
    },
  };
});
