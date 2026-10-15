import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const clientRoot = path.resolve(import.meta.dirname, "client");

type ModuleInfoGetter = (id: string) => { isEntry: boolean; importers: readonly string[] } | null;

/**
 * True when `id` is reachable from the entry through static imports only. Modules that are
 * only reached through a dynamic import() belong to a lazily loaded route, and manualChunks
 * uses that to keep them out of the chunks the landing page downloads.
 */
function isEagerlyLoaded(id: string, getModuleInfo: ModuleInfoGetter, cache: Map<string, boolean>): boolean {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  cache.set(id, false); // cycle guard
  const info = getModuleInfo(id);
  let eager = false;
  if (info) {
    eager = info.isEntry || info.importers.some((importer) => isEagerlyLoaded(importer, getModuleInfo, cache));
  }
  cache.set(id, eager);
  return eager;
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, clientRoot, "");
  const eagerCache = new Map<string, boolean>();
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
          manualChunks(id, { getModuleInfo }) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("/node_modules/firebase/") || id.includes("/node_modules/@firebase/")) {
              return "firebase";
            }
            if (id.includes("/node_modules/framer-motion/")) return "framer-motion";
            if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) {
              return "react";
            }
            // Radix primitives the landing page renders (slot, accordion, tooltip, toast and what
            // they share) form "radix-base"; every other Radix package goes to "radix", which only
            // the lazily loaded app routes pull in. The base set is assigned explicitly because
            // Rollup would otherwise fold modules shared with a manual chunk into that chunk.
            if (id.includes("/node_modules/@radix-ui/")) {
              return isEagerlyLoaded(id, getModuleInfo, eagerCache) ? "radix-base" : "radix";
            }
            return undefined;
          },
        },
      },
    },
  };
});
