import fs from "fs";
import path from "path";
import { brandPages, categoryPath, fetchCatalogueProducts, fetchFacets, petPath, productSlugPath, resolveBaseUrl, resolveEnv, taxonomyCategories, taxonomyPets } from "./catalogue-export.mjs";

/** Sitemap from the catalogue: static pages, pet and category pages, brand pages, supplier pages and every purchasable product at its slug URL. */
const STATIC_ROUTES = ["/", "/about/", "/features/", "/egypt/", "/privacy/", "/terms/", "/contact/", "/shop/", "/shop/suppliers/"];

const buildSitemap = async () => {
  const env = resolveEnv();
  const baseUrl = resolveBaseUrl(env);
  const buildLastMod = new Date().toISOString();
  const [{ items }, facets] = await Promise.all([fetchCatalogueProducts(env), fetchFacets(env)]);
  if (!items.length) throw new Error("Sitemap: the catalogue export returned no products.");

  const routes = [
    ...STATIC_ROUTES,
    ...taxonomyPets.map(petPath),
    ...taxonomyCategories.map(categoryPath),
    ...brandPages(facets).map((brand) => brand.path),
    ...(facets.suppliers ?? []).map((supplier) => `/shop/supplier/${supplier.id}/`),
    ...items.map((product) => productSlugPath(product.id, product.name)),
  ];
  const unique = [...new Set(routes)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + unique.map((route) => `  <url><loc>${route === "/" ? baseUrl : `${baseUrl}${route}`}</loc><lastmod>${buildLastMod}</lastmod></url>`).join("\n")
    + "\n</urlset>\n";

  const root = process.cwd();
  const outputDirs = [path.join(root, "dist"), path.join(root, "client", "public")].filter((dir) => fs.existsSync(dir));
  if (!outputDirs.length) throw new Error("No output directory found for sitemap generation.");
  for (const dir of outputDirs) fs.writeFileSync(path.join(dir, "sitemap.xml"), xml, "utf8");
  console.log(`Sitemap: ${unique.length} URLs (${items.length} products, ${taxonomyCategories.length} categories, ${brandPages(facets).length} brands) written to ${outputDirs.join(", ")}`);
};

buildSitemap().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exitCode = 1;
});
