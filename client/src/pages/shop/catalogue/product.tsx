import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ShopShell from "@/components/shop/ShopShell";
import CatalogueProductCard from "@/components/shop/CatalogueProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { ANDROID_STORE_URL, BASE_URL, IOS_STORE_URL } from "@/lib/seo/constants";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";
import { isCatalogueShop } from "@/lib/shopBackend";
import {
  callableMessage, cheapestOffer, formatMinor, getLegacyProduct, getProduct, getRecommendations, isCatalogueProductId, offersForVariant,
  type PublicOffer, type PublicProduct,
} from "@/lib/catalogueApi";

const IMAGE_LENS_SIZE = 180;
const IMAGE_ZOOM_SCALE = 2.2;
const RECOMMENDED_VISIBLE_LIMIT = 8;
const MAX_QTY = 10;

type ShippingZoneDoc = { id: string; label?: string; rateEGP?: number; shippingEtaLabel?: string };

const toSeoDescription = (value: string, maxLength = 155) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).trim();
};

function useCatalogueCartOptional() {
  // The cart provider is only mounted on the catalogue backend; in legacy mode this page is view-only.
  return isCatalogueShop ? useCatalogueCart() : null;
}

/** Product page for catalogue ids (product_*) and, on the catalogue backend, for legacy ids resolved through supplier + SKU. */
export default function CatalogueProductPage() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCatalogueCartOptional();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [canonicalId, setCanonicalId] = useState(productId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [variantId, setVariantId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [shippingZones, setShippingZones] = useState<ShippingZoneDoc[]>([]);
  const [recommended, setRecommended] = useState<PublicProduct[]>([]);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const viewTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setProduct(null); setVariantId(""); setOfferId(""); setSelectedImage(0); setQuantity(1);
    const load = async () => {
      if (isCatalogueProductId(productId)) {
        const found = await getProduct(productId);
        if (cancelled) return;
        setProduct(found); setCanonicalId(productId);
        return;
      }
      const resolved = await getLegacyProduct(productId);
      if (cancelled) return;
      setProduct(resolved.product);
      setCanonicalId(resolved.productId ?? productId);
    };
    load()
      .catch((err) => { if (!cancelled) setError(callableMessage(err, "Unable to load this product. Please try again.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, reload]);

  // Default to the first variant that has offers, then its cheapest offer.
  useEffect(() => {
    if (!product) return;
    const firstVariant = product.variants.find((v) => offersForVariant(product, v.id).length) ?? product.variants[0];
    if (firstVariant && !variantId) setVariantId(firstVariant.id);
  }, [product, variantId]);
  const variantOffers = useMemo(() => (product && variantId ? offersForVariant(product, variantId) : []), [product, variantId]);
  useEffect(() => {
    if (!variantOffers.length) { setOfferId(""); return; }
    if (!variantOffers.some((o) => o.id === offerId)) setOfferId(variantOffers[0].id);
  }, [variantOffers, offerId]);
  const selectedOffer: PublicOffer | undefined = variantOffers.find((o) => o.id === offerId) ?? (product ? cheapestOffer(product) : undefined);

  useEffect(() => {
    const supplierId = selectedOffer?.supplierId;
    if (!supplierId) { setShippingZones([]); return; }
    let cancelled = false;
    getDocs(collection(db, "suppliers", supplierId, "shippingZones"))
      .then((snap) => { if (!cancelled) setShippingZones(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ShippingZoneDoc[]); })
      .catch(() => { if (!cancelled) setShippingZones([]); });
    return () => { cancelled = true; };
  }, [selectedOffer?.supplierId]);
  const cheapestZone = useMemo(() => shippingZones.length ? [...shippingZones].sort((a, b) => (a.rateEGP ?? 0) - (b.rateEGP ?? 0))[0] : null, [shippingZones]);

  useEffect(() => {
    if (!product || isReactSnapPrerender()) { setRecommended([]); return; }
    let cancelled = false;
    getRecommendations()
      .then((result) => {
        if (cancelled) return;
        const pool = [...result.buyAgain, ...result.items].filter((p) => p.id !== product.id);
        const seen = new Set<string>();
        setRecommended(pool.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, RECOMMENDED_VISIBLE_LIMIT));
      })
      .catch(() => { if (!cancelled) setRecommended([]); });
    return () => { cancelled = true; };
  }, [product]);

  const images = product?.images ?? [];
  const safeImages = images.map((image) => toPrerenderSafeImageSrc(image) ?? image);
  const selectedImageUrl = safeImages[selectedImage] ?? null;
  const productName = product?.name ?? "Product";
  const canonicalPath = `/shop/product/${canonicalId}/`;
  const primarySupplierName = selectedOffer?.supplierName ?? product?.suppliers?.[0]?.name;
  const seoTitle = product
    ? `${productName}${variantId && product.variants.length > 1 ? ` (${product.variants.find((v) => v.id === variantId)?.label ?? ""})` : ""}${product.brand ? ` | ${product.brand}` : ""} | TwoPaws`
    : "Product | TwoPaws Shop";
  const seoDescription = toSeoDescription(
    product
      ? (product.description.trim().length >= 40 ? product.description : `Buy ${productName}${product.brand ? ` by ${product.brand}` : ""} online in Egypt from TwoPaws. Compare supplier prices, check availability and get fast delivery in Cairo and Giza.`)
      : "Browse pet products and supplier offers on TwoPaws."
  );
  const prices = product ? product.offers.map((o) => o.sellingPriceMinor) : [];
  const structuredData = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE_URL}${canonicalPath}#product`,
    name: productName,
    description: seoDescription,
    url: `${BASE_URL}${canonicalPath}`,
    image: images.length ? images : undefined,
    sku: product.id,
    category: product.categoryNames[0],
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: prices.length > 1 ? {
      "@type": "AggregateOffer",
      priceCurrency: META_PIXEL_CURRENCY,
      lowPrice: Math.min(...prices) / 100,
      highPrice: Math.max(...prices) / 100,
      offerCount: prices.length,
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}${canonicalPath}`,
    } : {
      "@type": "Offer",
      priceCurrency: META_PIXEL_CURRENCY,
      price: product.minimumPriceMinor / 100,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${BASE_URL}${canonicalPath}`,
      seller: primarySupplierName ? { "@type": "Organization", name: primarySupplierName } : undefined,
      ...(cheapestZone && typeof cheapestZone.rateEGP === "number" ? { shippingDetails: { "@type": "OfferShippingDetails", shippingRate: { "@type": "MonetaryAmount", value: cheapestZone.rateEGP, currency: META_PIXEL_CURRENCY }, shippingDestination: { "@type": "DefinedRegion", addressCountry: "EG" } } } : {}),
    },
  } : undefined;
  const breadcrumb = product ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${BASE_URL}/shop/` },
      ...(product.categoryNames[0] ? [{ "@type": "ListItem", position: 2, name: product.categoryNames[0], item: `${BASE_URL}/shop/?cat=${encodeURIComponent(product.categoryNames[0])}` }] : []),
      { "@type": "ListItem", position: product.categoryNames[0] ? 3 : 2, name: productName, item: `${BASE_URL}${canonicalPath}` },
    ],
  } : undefined;

  useEffect(() => {
    if (!product || viewTrackedRef.current === product.id) return;
    trackMetaEvent("ViewContent", { content_ids: [product.id], content_type: "product", content_name: product.name, value: product.minimumPriceMinor / 100, currency: META_PIXEL_CURRENCY });
    viewTrackedRef.current = product.id;
  }, [product]);

  const handleAddToCart = async () => {
    if (!product || !selectedOffer || !cart) return;
    setAdding(true);
    try {
      await cart.add(selectedOffer.id, quantity);
      trackMetaEvent("AddToCart", {
        content_ids: [product.id], content_type: "product", content_name: product.name,
        value: (selectedOffer.sellingPriceMinor * quantity) / 100, currency: META_PIXEL_CURRENCY,
        contents: [{ id: product.id, quantity, item_price: selectedOffer.sellingPriceMinor / 100 }],
      });
      toast({ title: "Added to cart", description: product.name });
      navigate("/cart");
    } catch (err) {
      toast({ title: "Unable to add", description: callableMessage(err), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const share = async () => {
    const url = `${BASE_URL}${canonicalPath}`;
    try {
      if (navigator.share) await navigator.share({ title: product?.name, url });
      else { await navigator.clipboard.writeText(url); setNotice("Product link copied."); }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setNotice("Copy the product URL from your browser to share it.");
    }
  };

  const handleImageMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setZoomPosition({ x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)) });
  };

  const regular = selectedOffer?.regularPriceMinor && selectedOffer.regularPriceMinor > selectedOffer.sellingPriceMinor ? selectedOffer.regularPriceMinor : null;

  return (
    <ShopShell>
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalPath}
        ogType="product"
        ogImageUrl={images[0]}
        structuredData={product && structuredData && breadcrumb ? [structuredData, breadcrumb] : undefined}
        noIndex={!loading && !product}
      />
      {loading && <p className="text-sm text-slate-500">Loading product...</p>}
      {!loading && error && (
        <div role="alert" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">{error}</p>
          <Button variant="outline" className="border-slate-200" onClick={() => setReload((n) => n + 1)}>Try again</Button>
        </div>
      )}
      {!loading && !error && !product && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">This product is not available right now</h1>
          <p className="text-sm text-slate-600">It may be out of stock at every supplier or no longer sold. Browse the shop for alternatives.</p>
          <Button asChild className="bg-brand-green-dark text-white"><Link to="/shop/">Browse the shop</Link></Button>
        </div>
      )}
      {product && (
        <>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <Link to="/shop/" className="hover:underline">Shop</Link>
            {product.categoryNames[0] ? <> › <Link to={`/shop/?cat=${encodeURIComponent(product.categoryNames[0])}`} className="hover:underline">{product.categoryNames[0]}</Link></> : null}
            {product.brand ? <> › <Link to={`/shop/?brand=${encodeURIComponent(product.brand)}`} className="hover:underline">{product.brand}</Link></> : null}
          </nav>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50" onMouseEnter={() => setZoomActive(Boolean(selectedImageUrl))} onMouseLeave={() => setZoomActive(false)} onMouseMove={handleImageMouseMove}>
                {images.length ? (
                  <img src={safeImages[selectedImage]} alt={product.name} className="mx-auto max-h-[420px] w-auto max-w-full cursor-zoom-in object-contain p-4" loading="eager" decoding="async" />
                ) : (
                  <div className="flex h-[420px] w-full items-center justify-center bg-slate-100 text-slate-400">No images</div>
                )}
                {zoomActive && selectedImageUrl ? (
                  <div className="pointer-events-none absolute hidden rounded-full border border-white/90 shadow-xl md:block" style={{ width: IMAGE_LENS_SIZE, height: IMAGE_LENS_SIZE, left: `calc(${zoomPosition.x}% - ${IMAGE_LENS_SIZE / 2}px)`, top: `calc(${zoomPosition.y}% - ${IMAGE_LENS_SIZE / 2}px)`, backgroundImage: `url(${selectedImageUrl})`, backgroundRepeat: "no-repeat", backgroundSize: `${IMAGE_ZOOM_SCALE * 100}%`, backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%` }} />
                ) : null}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {safeImages.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(index)} className={`overflow-hidden rounded-xl border ${index === selectedImage ? "border-brand-green-dark" : "border-slate-100"}`}>
                      <img src={image} alt="Thumbnail" width={320} height={80} className="h-20 w-full bg-white object-contain p-1" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {product.brand ? <Link to={`/shop/?brand=${encodeURIComponent(product.brand)}`} className="text-sm font-semibold uppercase tracking-wide text-slate-500 hover:underline">{product.brand}</Link> : null}
                  {regular ? <Badge className="bg-red-500 text-white">On sale</Badge> : null}
                  {product.therapeutic ? <Badge className="bg-amber-100 text-amber-900">Therapeutic</Badge> : null}
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{product.name}</h1>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl font-semibold text-brand-green-dark">{selectedOffer ? formatMinor(selectedOffer.sellingPriceMinor) : `From ${formatMinor(product.minimumPriceMinor)}`}</span>
                {regular ? <span className="text-lg text-slate-400 line-through">{formatMinor(regular)}</span> : null}
              </div>

              {product.variants.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const available = offersForVariant(product, variant.id).length > 0;
                      return (
                        <button key={variant.id} type="button" disabled={!available} onClick={() => { setVariantId(variant.id); setOfferId(""); }} className={`rounded-full border px-4 py-2 text-sm ${variantId === variant.id ? "border-brand-dark bg-brand-light text-brand-dark" : "border-slate-200 text-slate-700"} disabled:opacity-40`}>
                          {variant.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">{variantOffers.length > 1 ? "Choose a supplier" : "Sold by"}</p>
                <div className="mt-2 space-y-2">
                  {variantOffers.map((offer) => (
                    <label key={offer.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${offer.id === offerId ? "border-brand-dark bg-brand-light/40" : "border-slate-100"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="offer" value={offer.id} checked={offer.id === offerId} onChange={() => setOfferId(offer.id)} className="h-4 w-4" />
                        <span className="text-sm font-semibold text-slate-900">{offer.supplierName ?? offer.supplierId}</span>
                      </span>
                      <span className="text-sm font-semibold text-brand-green-dark">
                        {formatMinor(offer.sellingPriceMinor)}
                        {offer.regularPriceMinor && offer.regularPriceMinor > offer.sellingPriceMinor ? <span className="ml-2 text-xs font-normal text-slate-400 line-through">{formatMinor(offer.regularPriceMinor)}</span> : null}
                      </span>
                    </label>
                  ))}
                  {!variantOffers.length && <p className="text-sm text-slate-500">No supplier has this size in stock right now.</p>}
                </div>
                {cheapestZone ? (
                  <p className="mt-3 text-sm text-slate-500">Shipping from {formatCurrency(cheapestZone.rateEGP ?? 0)} · {cheapestZone.shippingEtaLabel ?? "Select at checkout"}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Delivery is priced at checkout.</p>
                )}
              </div>

              {product.therapeutic ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This is a therapeutic product. Check its suitability with your vet before purchasing.</p> : null}
              {product.requiresSuitabilityReview ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Pet suitability for this product has not been verified by TwoPaws yet. Check the label and your vet's advice.</p> : null}

              <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                {cart ? (
                  <>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700" htmlFor="qty">Quantity</label>
                      <Input id="qty" type="number" min={1} max={MAX_QTY} value={quantity} onChange={(event) => { const next = Number(event.target.value); if (!Number.isNaN(next)) setQuantity(Math.max(1, Math.min(next, MAX_QTY))); }} className="w-24" />
                    </div>
                    <Button className="bg-brand-green-dark text-white" disabled={!selectedOffer || adding} onClick={handleAddToCart}>{adding ? "Adding..." : "Add to cart"}</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">Buy this product in the TwoPaws app.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild className="bg-brand-green-dark text-white"><a href={`twopaws://twopaws.com/shop/product/${encodeURIComponent(canonicalId)}`}>Open in TwoPaws</a></Button>
                      <Button asChild variant="outline" className="border-slate-200"><a href={IOS_STORE_URL}>App Store</a></Button>
                      <Button asChild variant="outline" className="border-slate-200"><a href={ANDROID_STORE_URL}>Google Play</a></Button>
                    </div>
                  </>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" className="border-slate-200" onClick={share}>Share</Button>
                  {notice ? <p role="status" className="text-xs text-slate-500">{notice}</p> : null}
                </div>
              </div>
            </div>
          </div>

          {product.description ? (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">About this product</h2>
              <p className="whitespace-pre-line text-slate-600">{product.description}</p>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Recommended</h2>
            {recommended.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No similar products available right now.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {recommended.map((item) => <CatalogueProductCard key={item.id} product={item} cartQuantity={cart?.quantityByProduct[item.id] ?? 0} />)}
              </div>
            )}
          </section>
        </>
      )}
    </ShopShell>
  );
}
