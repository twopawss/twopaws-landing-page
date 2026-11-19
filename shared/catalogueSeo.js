/**
 * Search-result text and Offer schema for catalogue product pages. Shared by the prerender
 * (scripts/generate-product-ssg.mjs) and the hydrated page (client/src/pages/shop/catalogue/product.tsx)
 * so Google sees the same title, description and structured data before and after hydration.
 */

const CURRENCY = "EGP";
const MAX_DESCRIPTION = 155;

/** "EGP 2,450" or "EGP 2,450.50": whole pounds drop the decimals to keep titles and snippets short. */
export const formatSeoPrice = (minor) => {
  const value = Number(minor) / 100;
  const digits = Number.isInteger(value) ? 0 : 2;
  return `EGP ${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

/** Supplier copy often opens with a pasted "Description:" label and markdown bold; neither belongs in a snippet. */
export const cleanCatalogueDescription = (value) =>
  String(value ?? "")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:product\s+)?(?:descriptions?\b\s*[:\-–—]*|(?:details|overview)\s*[:\-–—]+)\s*/i, "");

const cutAtWord = (value, max = MAX_DESCRIPTION) => {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).replace(/[\s,;:.-]+$/g, "");
};

const sizeSuffix = (product, selectedVariantLabel) => {
  const name = String(product.name ?? "").trim().toLowerCase();
  const label = String(selectedVariantLabel ?? (product.variants?.length === 1 ? product.variants[0].label : "") ?? "").trim();
  // Some suppliers label the only variant with the full product name plus a SKU; that is not a size.
  const adds = label && label.length <= 30 && !name.includes(label.toLowerCase()) && !label.toLowerCase().includes(name);
  return adds ? ` (${label})` : "";
};

/** "{Product} ({size}) price in Egypt | {Brand} | TwoPaws". The brand is added only when the name does not already carry it. */
export const productSeoTitle = (product, selectedVariantLabel) => {
  const name = String(product.name ?? "").trim();
  const brand = String(product.brand ?? "").trim();
  const brandPart = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? ` | ${brand}` : "";
  return `${name}${sizeSuffix(product, selectedVariantLabel)} price in Egypt${brandPart} | TwoPaws`;
};

/** Product, price and delivery in at most 155 characters; the delivery sentence shortens before the product name is cut. */
export const productSeoDescription = (product) => {
  const name = String(product.name ?? "").trim();
  const several = (product.offers?.length ?? 0) > 1 || (product.variants?.length ?? 0) > 1;
  const lead = `Buy ${name} in Egypt ${several ? "from" : "for"} ${formatSeoPrice(product.minimumPriceMinor)} on TwoPaws.`;
  const tails = [" Delivery in Cairo and Giza, pay by cash on delivery or card.", " Delivery in Cairo and Giza.", ""];
  const tail = tails.find((candidate) => lead.length + candidate.length <= MAX_DESCRIPTION) ?? "";
  return cutAtWord(`${lead}${tail}`);
};

/** The catalogue's own description for schema and feeds, falling back to the snippet when the supplier gave none. */
export const productSchemaDescription = (product) => {
  const own = cleanCatalogueDescription(product.description);
  return own.length >= 40 ? own.slice(0, 5000) : productSeoDescription(product);
};

/**
 * Cairo and Giza delivery fee per supplier, mirroring the table on /shipping-and-returns/
 * (client/src/pages/marketing/shipping-returns.tsx). Keep the two in step. A supplier missing here gets
 * no shipping schema rather than a guessed fee.
 */
const SUPPLIER_DELIVERY_EGP = { petyard: 50, zimapets: 50, dogzone: 50, wags: 50, "7pets": 80 };
export const supplierDeliveryRateEgp = (supplierName) =>
  SUPPLIER_DELIVERY_EGP[String(supplierName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;

/** Same day to two days in Cairo and Giza, per the delivery table. */
const shippingDetails = (rateEgp) => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: Number(rateEgp).toFixed(2), currency: CURRENCY },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "EG" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
  },
});

/** The 7-day return policy published at /shipping-and-returns/. */
const returnPolicy = (baseUrl) => ({
  "@type": "MerchantReturnPolicy",
  applicableCountry: "EG",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
  refundType: "https://schema.org/FullRefund",
  returnPolicyUrl: `${baseUrl}/shipping-and-returns/`,
});

const isoDate = (date) => date.toISOString().slice(0, 10);

/**
 * schema.org offers for a product. One offer becomes an Offer with the return policy, shipping fee and
 * delivery time Google asks for on merchant listings; several offers stay an AggregateOffer price range.
 * `shippingRateEgp` overrides the per-supplier table when the page knows the live zone fee.
 */
export const productOffersSchema = ({ product, baseUrl, canonicalUrl, shippingRateEgp, now = new Date() }) => {
  const prices = (product.offers ?? []).map((offer) => Number(offer.sellingPriceMinor));
  if (prices.length > 1) {
    return {
      "@type": "AggregateOffer",
      priceCurrency: CURRENCY,
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: prices.length,
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    };
  }
  const supplierName = product.offers?.[0]?.supplierName ?? product.suppliers?.[0]?.name;
  const rate = typeof shippingRateEgp === "number" ? shippingRateEgp : supplierDeliveryRateEgp(supplierName);
  const validUntil = new Date(now);
  validUntil.setUTCDate(validUntil.getUTCDate() + 30);
  return {
    "@type": "Offer",
    "@id": `${canonicalUrl}#offer`,
    priceCurrency: CURRENCY,
    price: (Number(product.minimumPriceMinor) / 100).toFixed(2),
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url: canonicalUrl,
    validFrom: isoDate(now),
    priceValidUntil: isoDate(validUntil),
    seller: supplierName ? { "@type": "Organization", name: supplierName } : undefined,
    hasMerchantReturnPolicy: returnPolicy(baseUrl),
    shippingDetails: rate === null ? undefined : shippingDetails(rate),
  };
};
