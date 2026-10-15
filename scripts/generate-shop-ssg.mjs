import fs from "fs";
import path from "path";
import {
  applyCoreSeo, categoryPath, escapeHtml, fetchFacets, fetchFirstPage, gridHtml, petPath, productSlugPath, readTemplate, resolveBaseUrl,
  resolveEnv, setRootContent, shellHtml, taxonomyCategories, taxonomyPets, upsertStructuredData, writePage,
} from "./catalogue-export.mjs";

/**
 * Prerenders /shop/, /shop/suppliers/ and /shop/supplier/{id}/ with intro copy, category links and the
 * first page of products from the catalogue, so these pages carry crawlable text and links. The React
 * app replaces the content on hydration. Supplier names and logos come from the legacy `suppliers`
 * documents (read over the Firestore REST API), product data from catalogueBrowse.
 */

const STRICT = process.env.SSG_STRICT === "true" || process.env.CI === "true";

const extractValue = (value) => {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number.parseInt(value.integerValue, 10);
  return undefined;
};

const fetchSupplierDocs = async (projectId, apiKey) => {
  if (!projectId || !apiKey) return [];
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/suppliers`);
  url.searchParams.set("pageSize", "200");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Shop SSG: supplier fetch failed (${res.status}).`);
  const data = await res.json();
  return (data.documents ?? []).map((doc) => {
    const fields = Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, extractValue(v)]));
    return { id: doc.name.split("/").pop(), ...fields };
  }).filter((doc) => doc.active !== false && doc.isActive !== false);
};

const SHOP_INTRO = [
  "TwoPaws is Egypt's pet supplies marketplace: dry and wet food, litter, treats, toys, grooming, flea and tick care and vet-recommended products from verified Cairo suppliers (PetYard, Zima Pets, Dogzone, Wags and 7 Pets), sold at supplier prices with delivery across Cairo and Giza, most of it the same day.",
  "Every product shows which supplier sells it and what delivery costs before you pay. Pay cash on delivery or by card and wallet through Paymob, and return unopened items within 7 days.",
];

const categoryLinksHtml = () =>
  taxonomyPets.map((pet) => `<div><h2 class="text-lg font-semibold text-slate-900">${escapeHtml(pet.name)}</h2><ul class="mt-2 flex flex-wrap gap-2">`
    + taxonomyCategories.filter((c) => c.pet === pet.key).map((c) => `<li><a href="${categoryPath(c)}" class="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">${escapeHtml(c.name)}</a></li>`).join("")
    + `</ul></div>`).join("");

const buildShopIndexHtml = (template, baseUrl, products, total, suppliers) => {
  const title = "TwoPaws Shop | Pet Food, Supplies & Accessories in Egypt";
  const description = "Shop pet food, litter, treats, toys and care from verified Egyptian suppliers at supplier prices, with same-day delivery in Cairo and Giza.";
  const structuredData = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "TwoPaws Shop", description, url: `${baseUrl}/shop/`, isPartOf: { "@type": "WebSite", name: "TwoPaws", url: baseUrl } },
    { "@context": "https://schema.org", "@type": "ItemList", name: "TwoPaws Shop products", numberOfItems: total, itemListElement: products.slice(0, 24).map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${baseUrl}${productSlugPath(p.id, p.name)}` })) },
  ];
  const body = shellHtml(
    `<header class="space-y-3"><h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">Pet shop in Egypt: food, litter, treats and care delivered</h1>${SHOP_INTRO.map((p) => `<p class="max-w-3xl text-slate-600">${escapeHtml(p)}</p>`).join("")}</header>`
    + `<section class="space-y-4">${categoryLinksHtml()}</section>`
    + `<section class="space-y-2"><h2 class="text-lg font-semibold text-slate-900">Shops on TwoPaws</h2><ul class="flex flex-wrap gap-2">${suppliers.map((s) => `<li><a href="/shop/supplier/${encodeURIComponent(s.id)}/" class="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">${escapeHtml(s.name || s.id)}</a></li>`).join("")}</ul></section>`
    + `<section class="space-y-4"><h2 class="text-xl font-semibold text-slate-900">Popular right now</h2>${gridHtml(baseUrl, products.slice(0, 24))}<p class="text-sm text-slate-500">${total} products available today.</p></section>`
  );
  let html = applyCoreSeo({ html: template, baseUrl, title, description, canonicalPath: "/shop/" });
  html = upsertStructuredData(html, "shop-jsonld", structuredData);
  return setRootContent(html, body);
};

const buildSuppliersIndexHtml = (template, baseUrl, suppliers) => {
  const title = "Supplier Shops | TwoPaws Shop";
  const description = "The verified Egyptian pet suppliers on TwoPaws, with their product counts, delivery areas and times. Shop each store or across all of them.";
  const structuredData = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "TwoPaws Suppliers", description, url: `${baseUrl}/shop/suppliers/` },
    { "@context": "https://schema.org", "@type": "ItemList", name: "TwoPaws supplier shops", numberOfItems: suppliers.length, itemListElement: suppliers.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name || s.id, url: `${baseUrl}/shop/supplier/${s.id}/` })) },
  ];
  const body = shellHtml(
    `<header class="space-y-3"><h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">Shop by supplier</h1><p class="max-w-3xl text-slate-600">${escapeHtml("TwoPaws lists products from verified Cairo pet suppliers. Each store sets its own delivery fee and time, shown on every product and at checkout; your order is handled and supported by TwoPaws.")}</p></header>`
    + `<section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">${suppliers.map((s) => `<a href="/shop/supplier/${encodeURIComponent(s.id)}/" class="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h2 class="text-lg font-semibold text-slate-900">${escapeHtml(s.name || s.id)}</h2><p class="text-sm text-slate-500">${s.count ? `${s.count} products` : "Browse products"}</p></a>`).join("")}</section>`
  );
  let html = applyCoreSeo({ html: template, baseUrl, title, description, canonicalPath: "/shop/suppliers/" });
  html = upsertStructuredData(html, "suppliers-jsonld", structuredData);
  return setRootContent(html, body);
};

const buildSupplierHtml = (template, baseUrl, supplier, products, total) => {
  const name = String(supplier.name || supplier.id);
  const title = `${name} | TwoPaws Supplier Shop`;
  const description = `Shop ${name} on TwoPaws: ${total} pet products at supplier prices with delivery in Cairo and Giza. Compare with other stores and pay cash or card.`;
  const canonicalPath = `/shop/supplier/${supplier.id}/`;
  const logo = supplier.logo_url || supplier.logoUrl || supplier.logo || "/og-image.webp";
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Store", name, url: `${baseUrl}${canonicalPath}`, image: [String(logo).startsWith("http") ? logo : `${baseUrl}${logo}`] },
    { "@context": "https://schema.org", "@type": "ItemList", name: `${name} products`, numberOfItems: total, itemListElement: products.slice(0, 24).map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${baseUrl}${productSlugPath(p.id, p.name)}` })) },
  ];
  const body = shellHtml(
    `<nav aria-label="Breadcrumb" class="text-xs text-slate-500"><a href="/shop/">Shop</a> › <a href="/shop/suppliers/">Suppliers</a> › ${escapeHtml(name)}</nav>`
    + `<header class="space-y-3"><h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">${escapeHtml(name)}</h1><p class="max-w-3xl text-slate-600">${escapeHtml(`${name} is a verified pet supplier on TwoPaws with ${total} products available today, from food and litter to care and accessories, delivered in Cairo and Giza. Prices are the supplier's own; delivery fee and time are shown at checkout.`)}</p></header>`
    + gridHtml(baseUrl, products.slice(0, 24))
  );
  let html = applyCoreSeo({ html: template, baseUrl, title, description, canonicalPath, ogImage: logo });
  html = upsertStructuredData(html, "supplier-jsonld", structuredData);
  return setRootContent(html, body);
};

const writeShopPages = async () => {
  const env = resolveEnv();
  const baseUrl = resolveBaseUrl(env);
  const template = readTemplate();
  let legacySuppliers = [];
  try {
    legacySuppliers = await fetchSupplierDocs(env.VITE_FIREBASE_PROJECT_ID, env.VITE_FIREBASE_API_KEY);
  } catch (err) {
    if (STRICT) throw err;
    console.warn("Shop SSG: unable to load suppliers.", err);
  }
  const facets = await fetchFacets(env);
  const counts = new Map((facets.suppliers ?? []).map((s) => [s.id, s]));
  // Only suppliers that currently have purchasable catalogue products get a page; names and logos come from the legacy document.
  const suppliers = (facets.suppliers ?? []).map((s) => ({ ...(legacySuppliers.find((d) => d.id === s.id) ?? {}), id: s.id, name: legacySuppliers.find((d) => d.id === s.id)?.name ?? s.name, count: counts.get(s.id)?.count ?? 0 }));

  const shopPage = await fetchFirstPage(env, {});
  writePage("/shop/", buildShopIndexHtml(template, baseUrl, shopPage.items, shopPage.total, suppliers));
  writePage("/shop/suppliers/", buildSuppliersIndexHtml(template, baseUrl, suppliers));
  for (const supplier of suppliers) {
    const page = await fetchFirstPage(env, { supplierId: supplier.id });
    writePage(`/shop/supplier/${supplier.id}/`, buildSupplierHtml(template, baseUrl, supplier, page.items, page.total));
  }
  console.log(`Shop SSG: generated /shop/ (${shopPage.total} products), /shop/suppliers/ and ${suppliers.length} supplier page(s).`);
};

writeShopPages().catch((err) => {
  console.error("Shop SSG failed:", err);
  process.exitCode = 1;
});
