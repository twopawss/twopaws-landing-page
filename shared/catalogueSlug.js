/**
 * Product URL slugs, shared by the Vite client (through the @shared alias) and the build scripts.
 * Mirrors functions/src/commerce/catalogue_slug.ts in the appfunctions repo; keep the two identical.
 * URL: /shop/product/{slug}-{id}/ where the id keeps its product_ prefix and the slug comes from the
 * name alone. Slugs never contain "_", so the id can always be split off the end.
 */
export const slugify = (value, maxLength = 80) => {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  // Cut at the last word boundary when there is one, so a slug does not end mid-word.
  const boundary = cut.lastIndexOf("-");
  return (boundary > 0 ? cut.slice(0, boundary) : cut).replace(/-+$/g, "");
};

export const productSlugPath = (id, name) => {
  const slug = slugify(name);
  return `/shop/product/${slug ? `${slug}-${id}` : id}/`;
};

/** The catalogue id at the end of a product URL segment, slugged or bare; null for legacy ids. */
export const productIdFromSegment = (segment) => {
  const match = /(?:^|-)(product_[a-zA-Z0-9]+)$/.exec(String(segment ?? "").replace(/\/+$/, ""));
  return match ? match[1] : null;
};

export const brandSlugPath = (brand) => `/shop/brand/${slugify(brand)}/`;
