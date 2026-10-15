import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { brandSlugPath, productSlugPath, slugify } from "../shared/catalogueSlug.js";

/**
 * Build-time access to the catalogue for the prerender, sitemap and merchant feed.
 * Reads the public index through the catalogueBrowse callable (mode "export", 500 rows a page), so the
 * scripts need no Firestore key; the callable is public and returns exactly what the shop shows.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

export const DEFAULT_BASE_URL = "https://twopaws.pet";
export const CURRENCY = "EGP";
export const STRICT = process.env.SSG_STRICT === "true" || process.env.CI === "true";

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split("=");
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
};

export const resolveEnv = () => ({ ...readEnvFile(path.join(root, "client", ".env")), ...process.env });
export const resolveBaseUrl = (env = resolveEnv()) => (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

const callableUrl = (env, name) => {
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is required to read the catalogue.");
  return env.CATALOGUE_FUNCTIONS_ORIGIN
    ? `${env.CATALOGUE_FUNCTIONS_ORIGIN.replace(/\/+$/, "")}/${name}`
    : `https://us-central1-${projectId}.cloudfunctions.net/${name}`;
};

export const callCatalogue = async (env, name, data, attempt = 0) => {
  const response = await fetch(callableUrl(env, name), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) {
    if (attempt < 3 && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      return callCatalogue(env, name, data, attempt + 1);
    }
    throw new Error(`${name} failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
  const payload = await response.json();
  if (payload.error) throw new Error(`${name} error: ${payload.error.message ?? JSON.stringify(payload.error)}`);
  return payload.result;
};

/** Every purchasable product in the public index, with supplier names, as the shop sees them. */
export const fetchCatalogueProducts = async (env = resolveEnv()) => {
  const items = [];
  let cursor = "0";
  let generation = 0;
  while (cursor !== null) {
    const page = await callCatalogue(env, "catalogueBrowse", { mode: "export", cursor });
    if (!Array.isArray(page.items)) throw new Error("catalogueBrowse export returned no items; is the deployed function current?");
    items.push(...page.items);
    generation = page.generation ?? generation;
    cursor = page.nextCursor ?? null;
  }
  return { items, generation };
};

export const fetchFacets = (env = resolveEnv()) => callCatalogue(env, "catalogueBrowse", { mode: "facets" });

export const fetchFirstPage = (env, params) => callCatalogue(env, "catalogueBrowse", { limit: 24, ...params });

export const taxonomy = JSON.parse(fs.readFileSync(path.join(root, "shared", "catalogueTaxonomy.json"), "utf8"));
export const taxonomyPets = Object.entries(taxonomy.pets).map(([key, pet]) => ({ key, ...pet }));
export const taxonomyCategories = taxonomy.categories;
export const categoryPath = (category) => `/shop/${category.pet}/${category.slug}/`;
export const petPath = (pet) => `/shop/${pet.key}/`;

const normalize = (value) => String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

/** The taxonomy category a product belongs to: the first category whose raw names and pet type match. Same rule as the client. */
export const categoryForProduct = (product) => {
  const raw = new Set((product.categoryNames ?? []).map(normalize));
  const pets = new Set(product.petTypes ?? []);
  for (const category of taxonomyCategories) {
    const pet = taxonomyPets.find((p) => p.key === category.pet);
    const petOk = !pet?.petType || pets.has(pet.petType);
    if (petOk && category.raw.some((name) => raw.has(normalize(name)))) return category;
  }
  return null;
};

export const cheapestOffer = (product) => [...(product.offers ?? [])].sort((a, b) => a.sellingPriceMinor - b.sellingPriceMinor)[0] ?? null;
export const offersForVariant = (product, variantId) => (product.offers ?? []).filter((o) => o.variantId === variantId).sort((a, b) => a.sellingPriceMinor - b.sellingPriceMinor);
export const minor = (value) => (Number(value) / 100).toFixed(2);
export const formatEgp = (value) => `EGP ${(Number(value) / 100).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Brands with enough products to deserve a landing page, from facets (which already merge spellings). */
export const brandPages = (facets, minimum = 3) =>
  (facets.brands ?? [])
    .filter((brand) => brand.count >= minimum && slugify(brand.name))
    .map((brand) => ({ name: brand.name, slug: slugify(brand.name), count: brand.count, path: brandSlugPath(brand.name) }));

export { brandSlugPath, productSlugPath, slugify };

/** The product title pattern from the SEO audit: "{Product} ({size}) | {Brand} | TwoPaws". The size is the single variant's label when it adds information. */
export const productTitle = (product) => {
  const name = String(product.name ?? "").trim();
  const single = product.variants?.length === 1 ? String(product.variants[0].label ?? "").trim() : "";
  const size = single && single.toLowerCase() !== name.toLowerCase() && !name.toLowerCase().includes(single.toLowerCase()) ? ` (${single})` : "";
  const brand = String(product.brand ?? "").trim();
  const brandPart = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? ` | ${brand}` : "";
  return `${name}${size}${brandPart} | TwoPaws`;
};

/** A description of at most 155 characters that ends on a word, never with an ellipsis. */
export const productDescription = (product) => {
  const own = String(product.description ?? "").replace(/\s+/g, " ").trim();
  const brand = String(product.brand ?? "").trim();
  const base = own.length >= 40
    ? own
    : `Buy ${product.name}${brand ? ` by ${brand}` : ""} online in Egypt from TwoPaws. Compare supplier prices and get fast delivery in Cairo and Giza.`;
  if (base.length <= 155) return base;
  const cut = base.slice(0, 155);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).replace(/[\s,;:.-]+$/g, "");
};

export const escapeHtml = (value = "") =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export const setTitle = (html, value) => {
  const next = `<title>${escapeHtml(value)}</title>`;
  return /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, next) : html.replace("</head>", `  ${next}\n</head>`);
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const upsertMetaByName = (html, name, content) => {
  const next = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+name=["']${escapeRegExp(name)}["'][^>]*>`, "i");
  return pattern.test(html) ? html.replace(pattern, next) : html.replace("</head>", `  ${next}\n</head>`);
};
export const upsertMetaByProperty = (html, property, content) => {
  const next = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+property=["']${escapeRegExp(property)}["'][^>]*>`, "i");
  return pattern.test(html) ? html.replace(pattern, next) : html.replace("</head>", `  ${next}\n</head>`);
};
export const upsertCanonical = (html, canonicalUrl) => {
  const next = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  return /<link\s+rel=["']canonical["'][^>]*>/i.test(html) ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, next) : html.replace("</head>", `  ${next}\n</head>`);
};
export const upsertStructuredData = (html, id, payload) => {
  const safeJson = JSON.stringify(payload).replaceAll("<", "\\u003c");
  const next = `<script id="${id}" type="application/ld+json">${safeJson}</script>`;
  const pattern = new RegExp(`<script[^>]*id=["']${escapeRegExp(id)}["'][\\s\\S]*?<\\/script>`, "i");
  return pattern.test(html) ? html.replace(pattern, next) : html.replace("</head>", `  ${next}\n</head>`);
};
/** Puts prerendered page content inside the app root; React replaces it on hydration (main.tsx uses createRoot). */
export const setRootContent = (html, content) =>
  html.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script)/i, `<div id="root">${content}</div>\n    `);

export const applyCoreSeo = ({ html, baseUrl, title, description, canonicalPath, ogType = "website", ogImage, robots }) => {
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const image = ogImage && String(ogImage).startsWith("http") ? ogImage : `${baseUrl}${ogImage ?? "/og-image.webp"}`;
  let next = html;
  next = setTitle(next, title);
  next = upsertMetaByName(next, "description", description);
  if (robots) next = upsertMetaByName(next, "robots", robots);
  next = upsertCanonical(next, canonicalUrl);
  next = upsertMetaByProperty(next, "og:site_name", "TwoPaws");
  next = upsertMetaByProperty(next, "og:type", ogType);
  next = upsertMetaByProperty(next, "og:title", title);
  next = upsertMetaByProperty(next, "og:description", description);
  next = upsertMetaByProperty(next, "og:url", canonicalUrl);
  next = upsertMetaByProperty(next, "og:image", image);
  next = upsertMetaByName(next, "twitter:card", "summary_large_image");
  next = upsertMetaByName(next, "twitter:title", title);
  next = upsertMetaByName(next, "twitter:description", description);
  next = upsertMetaByName(next, "twitter:image", image);
  return next;
};

export const readTemplate = () => {
  const templatePath = path.join(root, "dist", "index.html");
  if (!fs.existsSync(templatePath)) throw new Error("dist/index.html not found. Run vite build first.");
  return fs.readFileSync(templatePath, "utf8");
};

export const writePage = (relativePath, html) => {
  const dir = path.join(root, "dist", ...relativePath.split("/").filter(Boolean));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
};

/** A product card as static HTML for category, brand and recommendation grids. */
export const productCardHtml = (baseUrl, product) => {
  const offer = cheapestOffer(product);
  const image = product.images?.[0];
  const href = productSlugPath(product.id, product.name);
  return `<a href="${href}" class="block h-full"><div class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">`
    + `<div class="flex h-44 w-full items-center justify-center overflow-hidden bg-white sm:h-56">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="512" height="512" class="h-full w-full object-contain p-4" loading="lazy" decoding="async" />` : ""}</div>`
    + `<div class="flex flex-1 flex-col gap-1 p-4">${product.brand ? `<p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(product.brand)}</p>` : ""}`
    + `<h3 class="text-base font-semibold leading-snug text-slate-900">${escapeHtml(product.name)}</h3>`
    + `<p class="mt-auto pt-3 text-sm font-semibold text-brand-green-dark">${(product.variants?.length > 1 || (product.supplierIds?.length ?? 0) > 1) ? "From " : ""}${escapeHtml(formatEgp(product.minimumPriceMinor))}${offer?.regularPriceMinor > offer?.sellingPriceMinor ? ` <span class="text-xs font-normal text-slate-400 line-through">${escapeHtml(formatEgp(offer.regularPriceMinor))}</span>` : ""}</p>`
    + `</div></div></a>`;
};

export const gridHtml = (baseUrl, products) =>
  `<section class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">${products.map((p) => productCardHtml(baseUrl, p)).join("")}</section>`;

export const shellHtml = (inner) =>
  `<div class="min-h-screen bg-white text-slate-900"><header class="border-b border-slate-100 bg-white"><div class="flex h-16 w-full items-center gap-6 px-4 sm:px-6 lg:px-8"><a href="/shop/" class="text-lg font-semibold text-brand-green-dark">TwoPaws Shop</a><nav class="hidden items-center gap-6 text-sm text-slate-600 md:flex"><a href="/">Home</a><a href="/shop/">Shop</a><a href="/shop/cats/dry-food/">Cats</a><a href="/shop/dogs/dry-food/">Dogs</a></nav></div></header>`
  + `<main class="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">${inner}</main></div>`;
