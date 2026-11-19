import {
  applyCoreSeo, brandPages, categoryPath, escapeHtml, fetchFacets, fetchFirstPage, gridHtml, petPath, productSlugPath, readTemplate,
  resolveBaseUrl, resolveEnv, setRootContent, shellHtml, taxonomyCategories, taxonomyPets, upsertStructuredData, writePage,
} from "./catalogue-export.mjs";

/**
 * Prerenders the taxonomy landing pages (/shop/{pet}/, /shop/{pet}/{category}/) and brand pages
 * (/shop/brand/{brand}/): title, description, canonical, H1, intro copy, ItemList and BreadcrumbList
 * schema, and the first page of products as static HTML so every page has crawlable links.
 */

const MIN_BRAND_PRODUCTS = Number.parseInt(process.env.MIN_BRAND_PRODUCTS ?? "3", 10);

const buildLandingHtml = ({ template, baseUrl, title, h1, intro, canonicalPath, crumbs, products, total, chips, sections = [], faq = [] }) => {
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const description = intro.length <= 155 ? intro : intro.slice(0, 155).replace(/\s+\S*$/, "");
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${h1} products`,
    numberOfItems: total,
    itemListElement: products.slice(0, 24).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, url: `${baseUrl}${productSlugPath(product.id, product.name)}` })),
  };
  const collection = { "@context": "https://schema.org", "@type": "CollectionPage", name: h1, description, url: canonicalUrl, isPartOf: { "@type": "WebSite", name: "TwoPaws", url: baseUrl } };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${baseUrl}/shop/` },
      ...crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 2, name: c.name, item: `${baseUrl}${c.path}` })),
      { "@type": "ListItem", position: crumbs.length + 2, name: h1, item: canonicalUrl },
    ],
  };
  const body = shellHtml(
    `<nav aria-label="Breadcrumb" class="text-xs text-slate-500"><a href="/shop/">Shop</a>${crumbs.map((c) => ` › <a href="${c.path}">${escapeHtml(c.name)}</a>`).join("")} › ${escapeHtml(h1)}</nav>`
    + `<header class="space-y-3"><h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">${escapeHtml(h1)}</h1><p class="max-w-3xl text-slate-600">${escapeHtml(intro)}</p>`
    + (chips.length ? `<div class="flex flex-wrap gap-2">${chips.map((c) => `<a href="${c.path}" class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">${escapeHtml(c.name)}</a>`).join("")}</div>` : "")
    + `<p class="text-sm text-slate-500">${total} products</p></header>`
    + gridHtml(baseUrl, products)
    + (sections.length ? `<section class="space-y-6 rounded-lg border border-slate-200 bg-white p-5">${sections.map((s) => `<div class="space-y-2"><h2 class="text-xl font-semibold text-slate-900">${escapeHtml(s.heading)}</h2><p class="text-slate-600">${escapeHtml(s.body)}</p></div>`).join("")}`
      + (faq.length ? `<div class="space-y-3"><h2 class="text-xl font-semibold text-slate-900">Questions about ${escapeHtml(h1.toLowerCase())}</h2><dl class="space-y-3">${faq.map((f) => `<div><dt class="font-semibold text-slate-900">${escapeHtml(f.q)}</dt><dd class="mt-1 text-slate-600">${escapeHtml(f.a)}</dd></div>`).join("")}</dl></div>` : "")
      + `</section>` : "")
  );
  let html = applyCoreSeo({ html: template, baseUrl, title, description, canonicalPath });
  if (faq.length) html = upsertStructuredData(html, "faq-jsonld", { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  html = upsertStructuredData(html, "collection-jsonld", collection);
  html = upsertStructuredData(html, "itemlist-jsonld", itemList);
  html = upsertStructuredData(html, "breadcrumb-jsonld", breadcrumb);
  html = setRootContent(html, body);
  return html;
};

const writeLandingPages = async () => {
  const env = resolveEnv();
  const baseUrl = resolveBaseUrl(env);
  const template = readTemplate();
  let written = 0;
  const empty = [];

  for (const pet of taxonomyPets) {
    const chips = taxonomyCategories.filter((c) => c.pet === pet.key).map((c) => ({ name: c.name, path: categoryPath(c) }));
    const page = await fetchFirstPage(env, pet.petType ? { petType: pet.petType } : {});
    writePage(petPath(pet), buildLandingHtml({
      template, baseUrl, title: `${pet.name} supplies in Egypt | TwoPaws Shop`, h1: `${pet.name}: food, care and supplies`, intro: pet.description,
      canonicalPath: petPath(pet), crumbs: [], products: page.items, total: page.total, chips,
    }));
    written += 1;
    for (const category of taxonomyCategories.filter((c) => c.pet === pet.key)) {
      const result = await fetchFirstPage(env, { categories: category.raw, ...(pet.petType ? { petType: pet.petType } : {}) });
      if (!result.total) empty.push(`${category.pet}/${category.slug}`);
      writePage(categoryPath(category), buildLandingHtml({
        template, baseUrl, title: `${category.name} in Egypt | TwoPaws Shop`, h1: category.name, intro: category.description,
        canonicalPath: categoryPath(category), crumbs: [{ name: pet.name, path: petPath(pet) }], products: result.items, total: result.total, chips,
        sections: category.sections ?? [], faq: category.faq ?? [],
      }));
      written += 1;
    }
  }

  const facets = await fetchFacets(env);
  const brands = brandPages(facets, MIN_BRAND_PRODUCTS);
  for (const brand of brands) {
    const result = await fetchFirstPage(env, { brand: brand.slug });
    writePage(brand.path, buildLandingHtml({
      template, baseUrl, title: `${brand.name} products in Egypt | TwoPaws Shop`, h1: brand.name,
      intro: `Shop ${brand.name} pet food and supplies at supplier prices on TwoPaws, with fast delivery in Cairo and Giza.`,
      canonicalPath: brand.path, crumbs: [], products: result.items, total: result.total, chips: [],
    }));
    written += 1;
  }
  console.log(`Category SSG: generated ${written} landing page(s) (${taxonomyPets.length} pets, ${taxonomyCategories.length} categories, ${brands.length} brands).${empty.length ? ` Empty categories: ${empty.join(", ")}.` : ""}`);
};

writeLandingPages().catch((err) => {
  console.error("Category SSG failed:", err);
  process.exitCode = 1;
});
