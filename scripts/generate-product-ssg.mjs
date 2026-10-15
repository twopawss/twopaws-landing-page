import {
  CURRENCY, applyCoreSeo, brandSlugPath, categoryForProduct, categoryPath, cheapestOffer, escapeHtml, fetchCatalogueProducts,
  formatEgp, gridHtml, offersForVariant, productDescription, productSlugPath, productTitle, readTemplate, resolveBaseUrl, resolveEnv,
  setRootContent, shellHtml, upsertStructuredData, writePage,
} from "./catalogue-export.mjs";

/**
 * Prerenders one page per purchasable catalogue product at /shop/product/{slug}-{id}/ with the
 * catalogue's own title, description, price, H1, breadcrumb and Product schema in the static HTML.
 * Legacy /shop/product/{legacyId}/ pages are no longer written: Hosting rewrites them to the
 * shopProductRedirect function, which 301s to the slug URL.
 */

const buildPriceValidUntil = (daysAhead = 30) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
};

const buildProductHtml = (template, baseUrl, product, related) => {
  const canonicalPath = productSlugPath(product.id, product.name);
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const title = productTitle(product);
  const description = productDescription(product);
  const category = categoryForProduct(product);
  const offer = cheapestOffer(product);
  const prices = product.offers.map((o) => o.sellingPriceMinor);
  const supplierNames = [...new Set(product.offers.map((o) => o.supplierName).filter(Boolean))];
  const images = (product.images ?? []).filter((url) => String(url).startsWith("http"));

  const offers = prices.length > 1
    ? {
        "@type": "AggregateOffer",
        priceCurrency: CURRENCY,
        lowPrice: (Math.min(...prices) / 100).toFixed(2),
        highPrice: (Math.max(...prices) / 100).toFixed(2),
        offerCount: prices.length,
        availability: "https://schema.org/InStock",
        url: canonicalUrl,
      }
    : {
        "@type": "Offer",
        "@id": `${canonicalUrl}#offer`,
        priceCurrency: CURRENCY,
        price: (product.minimumPriceMinor / 100).toFixed(2),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        url: canonicalUrl,
        priceValidUntil: buildPriceValidUntil(),
        seller: supplierNames[0] ? { "@type": "Organization", name: supplierNames[0] } : undefined,
      };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name: product.name,
    description,
    url: canonicalUrl,
    image: images.length ? images : undefined,
    sku: product.id,
    category: category?.googleProductCategory,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${baseUrl}/shop/` },
      ...(category ? [{ "@type": "ListItem", position: 2, name: category.name, item: `${baseUrl}${categoryPath(category)}` }] : []),
      { "@type": "ListItem", position: category ? 3 : 2, name: product.name, item: canonicalUrl },
    ],
  };

  const variantRows = product.variants.map((variant) => {
    const rows = offersForVariant(product, variant.id);
    if (!rows.length) return "";
    return `<li class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><span class="text-sm font-semibold text-slate-900">${escapeHtml(variant.label)}</span><span class="text-sm text-slate-600">${rows.map((o) => `${escapeHtml(o.supplierName ?? o.supplierId)} ${escapeHtml(formatEgp(o.sellingPriceMinor))}`).join(" · ")}</span></li>`;
  }).join("");
  const body = shellHtml(
    `<nav aria-label="Breadcrumb" class="text-xs text-slate-500"><a href="/shop/">Shop</a>${category ? ` › <a href="${categoryPath(category)}">${escapeHtml(category.name)}</a>` : ""}${product.brand ? ` › <a href="${brandSlugPath(product.brand)}">${escapeHtml(product.brand)}</a>` : ""}</nav>`
    + `<div class="grid gap-8 lg:grid-cols-2"><div class="rounded-2xl border border-slate-100 bg-slate-50">${images[0] ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}" class="mx-auto max-h-[420px] w-auto max-w-full object-contain p-4" />` : ""}</div>`
    + `<div class="space-y-6">${product.brand ? `<a href="${brandSlugPath(product.brand)}" class="text-sm font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(product.brand)}</a>` : ""}`
    + `<h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">${escapeHtml(product.name)}</h1>`
    + `<p class="text-3xl font-semibold text-brand-green-dark">${prices.length > 1 || product.variants.length > 1 ? "From " : ""}${escapeHtml(formatEgp(product.minimumPriceMinor))}${offer?.regularPriceMinor > offer?.sellingPriceMinor ? ` <span class="text-lg font-normal text-slate-400 line-through">${escapeHtml(formatEgp(offer.regularPriceMinor))}</span>` : ""}</p>`
    + `<p class="text-sm text-slate-600">Sold by ${escapeHtml(supplierNames.join(", ") || "TwoPaws suppliers")} with delivery in Cairo and Giza.</p>`
    + (variantRows ? `<ul class="space-y-2">${variantRows}</ul>` : "")
    + `<a href="${canonicalPath}" class="inline-flex rounded-full bg-brand-green-dark px-5 py-2 text-sm font-semibold text-white">Add to cart</a>`
    + `</div></div>`
    + (product.description ? `<section class="space-y-2"><h2 class="text-xl font-semibold text-slate-900">About this product</h2><p class="whitespace-pre-line text-slate-600">${escapeHtml(product.description)}</p></section>` : "")
    + (related.length ? `<section class="space-y-4"><h2 class="text-2xl font-semibold text-slate-900">${category ? `More in ${escapeHtml(category.name)}` : "You may also like"}</h2>${gridHtml(baseUrl, related)}</section>` : "")
  );

  let html = applyCoreSeo({ html: template, baseUrl, title, description, canonicalPath, ogType: "product", ogImage: images[0] });
  html = upsertStructuredData(html, "product-jsonld", structuredData);
  html = upsertStructuredData(html, "breadcrumb-jsonld", breadcrumb);
  html = setRootContent(html, body);
  return html;
};

const writeProductPages = async () => {
  const env = resolveEnv();
  const baseUrl = resolveBaseUrl(env);
  const template = readTemplate();
  const { items, generation } = await fetchCatalogueProducts(env);
  if (!items.length) throw new Error("Product SSG: the catalogue export returned no products.");

  const byCategory = new Map();
  for (const product of items) {
    const category = categoryForProduct(product);
    const key = category ? `${category.pet}/${category.slug}` : "";
    const list = byCategory.get(key) ?? [];
    list.push(product);
    byCategory.set(key, list);
  }
  let written = 0;
  for (const product of items) {
    const category = categoryForProduct(product);
    const pool = (byCategory.get(category ? `${category.pet}/${category.slug}` : "") ?? []).filter((p) => p.id !== product.id);
    const related = pool.slice(0, 8);
    writePage(productSlugPath(product.id, product.name), buildProductHtml(template, baseUrl, product, related));
    written += 1;
  }
  console.log(`Product SSG: generated ${written} catalogue product page(s) from index generation ${generation}.`);
};

writeProductPages().catch((err) => {
  console.error("Product SSG failed:", err);
  process.exitCode = 1;
});
