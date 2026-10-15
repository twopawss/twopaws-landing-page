/**
 * Which backend the shop pages use. Set VITE_SHOP_BACKEND=catalogue at build time to serve the
 * catalogue callables (catalogueBrowse / catalogueCart / catalogueCheckout); anything else keeps the
 * legacy Firestore products collection. The value is a build constant, so each page picks its
 * implementation once at module load rather than branching inside hooks.
 */
export type ShopBackend = "legacy" | "catalogue";

const raw = String(import.meta.env.VITE_SHOP_BACKEND ?? "").trim().toLowerCase();
export const SHOP_BACKEND: ShopBackend = raw === "catalogue" ? "catalogue" : "legacy";
export const isCatalogueShop = SHOP_BACKEND === "catalogue";
