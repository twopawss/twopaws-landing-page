import fs from "fs";
import path from "path";
import { CURRENCY, categoryForProduct, fetchCatalogueProducts, minor, offersForVariant, productSlugPath, resolveBaseUrl, resolveEnv } from "./catalogue-export.mjs";

/**
 * Google Merchant Center feed from the catalogue: one item per purchasable variant, priced at its
 * cheapest supplier offer, linking the product's slug URL. Item ids are variant ids so a product with
 * several pack sizes lists each size; variants of one product share item_group_id.
 */

const escapeXml = (value = "") =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const text = (value, maxLength) => {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : cleaned.slice(0, maxLength).trim();
};
const tag = (name, value) => (value === undefined || value === null || value === "" ? "" : `<${name}>${escapeXml(value)}</${name}>`);

const buildItems = (baseUrl, product) => {
  const link = `${baseUrl}${productSlugPath(product.id, product.name)}`;
  const images = (product.images ?? []).filter((url) => String(url).startsWith("http"));
  if (!images.length) return [];
  const category = categoryForProduct(product);
  const description = text(product.description || `${product.name} from TwoPaws suppliers in Egypt, delivered in Cairo and Giza.`, 5000);
  const items = [];
  for (const variant of product.variants ?? []) {
    const offers = offersForVariant(product, variant.id);
    const offer = offers[0];
    if (!offer) continue;
    const label = String(variant.label ?? "").trim();
    const title = text(label && label.toLowerCase() !== product.name.toLowerCase() && !product.name.toLowerCase().includes(label.toLowerCase()) ? `${product.name} ${label}` : product.name, 150);
    const sale = offer.regularPriceMinor > offer.sellingPriceMinor;
    items.push([
      "<item>",
      tag("g:id", variant.id),
      tag("g:item_group_id", product.id),
      tag("g:title", title),
      tag("g:description", description),
      tag("g:link", link),
      tag("g:image_link", images[0]),
      ...images.slice(1, 10).map((image) => tag("g:additional_image_link", image)),
      tag("g:availability", "in_stock"),
      tag("g:condition", "new"),
      tag("g:price", `${minor(sale ? offer.regularPriceMinor : offer.sellingPriceMinor)} ${CURRENCY}`),
      sale ? tag("g:sale_price", `${minor(offer.sellingPriceMinor)} ${CURRENCY}`) : "",
      tag("g:brand", product.brand || "TwoPaws"),
      tag("g:product_type", category ? `${category.pet === "pets" ? "Pets" : category.pet === "cats" ? "Cats" : "Dogs"} > ${category.name}` : (product.categoryNames ?? [])[0]),
      tag("g:google_product_category", category?.googleProductCategory ?? "Animals & Pet Supplies > Pet Supplies"),
      tag("g:identifier_exists", "no"),
      "</item>",
    ].filter(Boolean).join("\n"));
  }
  return items;
};

const writeMerchantFeed = async () => {
  const env = resolveEnv();
  const baseUrl = resolveBaseUrl(env);
  const { items: products } = await fetchCatalogueProducts(env);
  if (!products.length) throw new Error("Merchant feed: the catalogue export returned no products.");
  const items = products.flatMap((product) => buildItems(baseUrl, product));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    "  <title>TwoPaws Product Feed</title>",
    `  <link>${escapeXml(`${baseUrl}/shop/`)}</link>`,
    "  <description>TwoPaws catalogue for Google Merchant Center.</description>",
    items.map((item) => item.split("\n").map((line) => `  ${line}`).join("\n")).join("\n"),
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
  const root = process.cwd();
  const outputDirs = [path.join(root, "dist"), path.join(root, "client", "public")].filter((dir) => fs.existsSync(dir));
  if (!outputDirs.length) throw new Error("Merchant feed: no output directory found.");
  for (const dir of outputDirs) fs.writeFileSync(path.join(dir, "merchant-feed.xml"), xml, "utf8");
  console.log(`Merchant feed: wrote ${items.length} variant item(s) for ${products.length} products to ${outputDirs.join(", ")}`);
};

writeMerchantFeed().catch((err) => {
  console.error("Merchant feed generation failed:", err);
  process.exitCode = 1;
});
