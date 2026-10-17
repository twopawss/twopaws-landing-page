import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { catalogueFunctions, functions } from "@/lib/firebase";
import { formatCurrency } from "@/lib/format";

/** Typed client for the catalogue callables in the appfunctions repo (functions/src/commerce/catalogue_*). Amounts are integer piastres. */

export type PublicOffer = {
  id: string;
  variantId: string;
  supplierId: string;
  supplierName?: string;
  sellingPriceMinor: number;
  currency: string;
  regularPriceMinor?: number;
};

export type PublicProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  images: string[];
  categoryNames: string[];
  petTypes: string[];
  lifeStages: string[];
  therapeutic: boolean;
  requiresSuitabilityReview: boolean;
  minimumPriceMinor: number;
  currency: string;
  supplierIds: string[];
  suppliers?: { id: string; name: string }[];
  variants: { id: string; label: string }[];
  offers: PublicOffer[];
};

export type BrowseSort = "all" | "low" | "high" | "sale";

export type BrowseParams = {
  limit?: number;
  cursor?: string;
  supplierId?: string;
  query?: string;
  category?: string;
  brand?: string;
  sortMode?: BrowseSort;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  /** Taxonomy pages: any of these raw supplier category names, optionally within one pet type. */
  categories?: string[];
  petType?: "dog" | "cat" | "other";
};

export type BrowseList = {
  items: PublicProduct[];
  total: number;
  nextCursor: string | null;
  scanned: number;
};

export type Facets = {
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  suppliers: { id: string; name: string; count: number }[];
};

export type Suggestion = { text: string; kind: "brand" | "category" | "product" | "phrase"; count: number };

export type CartLine = {
  id: string;
  offerId: string;
  productId: string;
  variantId: string;
  supplierId: string;
  supplierName: string;
  name: string;
  brand: string;
  label: string;
  image: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  available?: boolean;
};

export type CartView = { items: CartLine[]; subtotalMinor: number; currency: string; message: string };

export type Quote = {
  items: CartLine[];
  quoteId: string;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  promoCode: string | null;
  totalMinor: number;
  currency: string;
  eta: string;
};

export type GuestAddressInput = {
  label?: string;
  recipientName?: string;
  phone: string;
  email?: string | null;
  country?: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  location?: { lat: number; lng: number } | null;
};

export type GuestCustomerInput = { firstName: string; lastName: string; phone?: string; email?: string | null };

export type GuestCartItem = { offerId: string; quantity: number };

export type CheckoutResult = {
  orderId: string;
  orderNumber: number;
  totalMinor: number;
  discountMinor: number;
  paymentMethod: "cash" | "card";
  requiresPayment: boolean;
  guestCheckoutToken?: string;
};

export type OrderStatus = {
  orderId: string;
  orderNumber: number;
  paymentStatus: string;
  status: string;
  paymentMethod: string;
  totalMinor: number;
  currency: string;
  paid: boolean;
  requiresPayment: boolean;
};

const CATALOGUE_CALLABLES = new Set(["catalogueBrowse", "catalogueSuggest", "catalogueCart", "catalogueCheckout"]);
const call = <Req, Res>(name: string) => httpsCallable<Req, Res>(CATALOGUE_CALLABLES.has(name) ? catalogueFunctions : functions, name);

export const browseProducts = async (params: BrowseParams) =>
  (await call<BrowseParams, BrowseList>("catalogueBrowse")(params)).data;

export const getProduct = async (productId: string, supplierId?: string) =>
  (await call<{ productId: string; supplierId?: string }, { product: PublicProduct | null }>("catalogueBrowse")({ productId, supplierId })).data.product;

/** Resolves a legacy products/{id} URL to its catalogue product, or null when the SKU is not in the catalogue. */
export const getLegacyProduct = async (legacyProductId: string) =>
  (await call<{ legacyProductId: string }, { productId: string | null; product: PublicProduct | null }>("catalogueBrowse")({ legacyProductId })).data;

export const getFacets = async () =>
  (await call<{ mode: "facets" }, Facets>("catalogueBrowse")({ mode: "facets" })).data;

export const getRecommendations = async (supplierId?: string) =>
  (await call<{ mode: "recommendations"; supplierId?: string }, { items: PublicProduct[]; buyAgain: PublicProduct[]; personalized: boolean }>("catalogueBrowse")({ mode: "recommendations", supplierId })).data;

export const suggest = async (query: string, limit = 8) =>
  (await call<{ query: string; limit: number }, { query: string; items: Suggestion[] }>("catalogueSuggest")({ query, limit })).data.items;

export type CartRequest =
  | { operation: "get" | "clear" | "addresses" }
  | { operation: "get"; items: GuestCartItem[] }
  | { operation: "add" | "set"; offerId: string; quantity: number }
  | { operation: "remove"; offerId: string }
  | { operation: "quote"; addressId: string; promoCode?: string }
  | { operation: "quote"; items: GuestCartItem[]; address: GuestAddressInput; promoCode?: string }
  | { operation: "orderStatus"; orderId: string; guestCheckoutToken?: string };

export const cartCall = async <Res = CartView>(request: CartRequest) =>
  (await call<CartRequest, Res>("catalogueCart")(request)).data;

export type CheckoutRequest = {
  idempotencyKey: string;
  paymentMethod: "cash" | "card";
  quoteId: string;
  promoCode?: string;
  source: "website";
} & ({ addressId: string } | { items: GuestCartItem[]; address: GuestAddressInput; customer: GuestCustomerInput });

export const checkout = async (request: CheckoutRequest) =>
  (await call<CheckoutRequest, CheckoutResult>("catalogueCheckout")(request)).data;

export const createPaymobPayment = async (orderId: string, guestCheckoutToken?: string) =>
  (await call<{ orderId: string; guestCheckoutToken?: string }, { clientSecret?: string; publicKey?: string }>("createPaymobPayment")({ orderId, guestCheckoutToken })).data;

/** The callable's error code without the "functions/" prefix, e.g. "aborted" when a quote went stale. */
export const callableCode = (error: unknown) =>
  error instanceof FirebaseError ? error.code.replace(/^functions\//, "") : "";

export const callableMessage = (error: unknown, fallback = "Something went wrong.") =>
  error instanceof Error && error.message ? error.message : fallback;

export const formatMinor = (minor: number) => formatCurrency(minor / 100);

/** Cheapest offer first; the public projection already sorts, this guards client-side copies. */
export const cheapestOffer = (product: PublicProduct) =>
  [...product.offers].sort((a, b) => a.sellingPriceMinor - b.sellingPriceMinor)[0];

export const offersForVariant = (product: PublicProduct, variantId: string) =>
  product.offers.filter((offer) => offer.variantId === variantId).sort((a, b) => a.sellingPriceMinor - b.sellingPriceMinor);

export const supplierNameOf = (product: PublicProduct, supplierId: string) =>
  product.offers.find((o) => o.supplierId === supplierId)?.supplierName
  ?? product.suppliers?.find((s) => s.id === supplierId)?.name
  ?? supplierId;

export const isCatalogueProductId = (id: string) => /^product_[a-zA-Z0-9_-]{1,92}$/.test(id);
