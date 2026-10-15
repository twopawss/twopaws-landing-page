import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import CatalogueProductCard from "@/components/shop/CatalogueProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { browseProducts, callableCode, callableMessage, cheapestOffer, type PublicProduct } from "@/lib/catalogueApi";
import { CatalogueSearchBox } from "@/pages/shop/catalogue";

const PAGE_SIZE = 48;

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="mt-4 space-y-2"><Skeleton className="h-4 w-full rounded-full" /><Skeleton className="h-4 w-3/4 rounded-full" /></div>
      <div className="mt-5 flex items-center justify-between"><Skeleton className="h-4 w-24 rounded-full" /><Skeleton className="h-4 w-12 rounded-full" /></div>
    </div>
  );
}

export default function CatalogueSupplierPage() {
  const { supplierId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { add, quantityByProduct } = useCatalogueCart();
  const { supplierMap, loading: suppliersLoading } = useSuppliers();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestRef = useRef(0);

  const supplier = supplierId ? supplierMap[supplierId] : undefined;
  const supplierName = supplier?.name ?? "Supplier";
  const supplierLogo = (supplier?.logo_url as string) || (supplier?.logoUrl as string) || (supplier?.logo as string);
  const absoluteSupplierLogo = supplierLogo ? (supplierLogo.startsWith("http") ? supplierLogo : `${BASE_URL}${supplierLogo.startsWith("/") ? "" : "/"}${supplierLogo}`) : undefined;

  const fetchPage = useCallback(async (cursor: string | null) => {
    const request = ++requestRef.current;
    if (cursor) setLoadingMore(true); else setLoading(true);
    try {
      const data = await browseProducts({ supplierId, query: submittedSearch || undefined, limit: PAGE_SIZE, cursor: cursor ?? undefined });
      if (requestRef.current !== request) return;
      setProducts((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setNextCursor(data.nextCursor);
    } catch (err) {
      if (requestRef.current !== request) return;
      if (cursor && callableCode(err) === "aborted") { setNextCursor(null); return; }
      toast({ title: "Unable to load products", description: callableMessage(err), variant: "destructive" });
      if (!cursor) { setProducts([]); setTotal(0); setNextCursor(null); }
    } finally {
      if (requestRef.current === request) { setLoading(false); setLoadingMore(false); }
    }
  }, [supplierId, submittedSearch, toast]);

  useEffect(() => {
    if (!supplierId || isReactSnapPrerender()) { setLoading(false); return; }
    void fetchPage(null);
  }, [supplierId, fetchPage]);

  const handleAdd = useCallback(async (product: PublicProduct) => {
    if (product.variants.length > 1) { navigate(`/shop/product/${product.id}/`); return; }
    const offer = product.offers.find((o) => o.supplierId === supplierId) ?? cheapestOffer(product);
    if (!offer) return;
    try {
      await add(offer.id, 1);
      trackMetaEvent("AddToCart", { content_ids: [product.id], content_type: "product", content_name: product.name, value: offer.sellingPriceMinor / 100, currency: META_PIXEL_CURRENCY, contents: [{ id: product.id, quantity: 1, item_price: offer.sellingPriceMinor / 100 }] });
      toast({ title: "Added to cart", description: product.name });
    } catch (err) {
      toast({ title: "Add to cart failed", description: callableMessage(err), variant: "destructive" });
    }
  }, [add, navigate, supplierId, toast]);

  const canonicalPath = supplierId ? `/shop/supplier/${supplierId}/` : "/shop/suppliers/";
  const seoDescription = supplier ? `Shop ${supplierName} on TwoPaws for pet food, accessories, and essentials with delivery in Egypt.` : "Browse supplier shops on TwoPaws and discover pet products available for delivery in Egypt.";
  const structuredData = useMemo(() => supplierId ? [
    { "@context": "https://schema.org", "@type": "Store", name: supplierName, url: `${BASE_URL}${canonicalPath}`, image: absoluteSupplierLogo ? [absoluteSupplierLogo] : undefined },
    { "@context": "https://schema.org", "@type": "ItemList", name: `${supplierName} products`, ...(total !== null ? { numberOfItems: total } : {}), itemListElement: products.slice(0, 24).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, url: `${BASE_URL}/shop/product/${product.id}/` })) },
  ] : undefined, [absoluteSupplierLogo, canonicalPath, supplierId, supplierName, products, total]);

  const headerSearch = (
    <div className="mx-auto flex w-full max-w-[980px] items-center gap-2">
      <CatalogueSearchBox value={search} onChange={setSearch} onSubmit={(value) => setSubmittedSearch(value.trim())} placeholder={`Search in ${supplierName}...`} />
      {submittedSearch && <Button variant="outline" className="hidden border-slate-200 sm:inline-flex" onClick={() => { setSearch(""); setSubmittedSearch(""); }}>Clear</Button>}
    </div>
  );

  return (
    <ShopShell headerContent={headerSearch}>
      <Seo title={`${supplierName} | TwoPaws Supplier Shop`} description={seoDescription} canonicalUrl={canonicalPath} structuredData={structuredData} noIndex={!suppliersLoading && !supplier} />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Supplier shop</p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{supplierName}</h1>
        <p className="text-slate-600">Explore products sold by this supplier.</p>
        <p className="text-sm text-slate-500">{submittedSearch ? `Results for "${submittedSearch}" (${total ?? "…"})` : `${total ?? "…"} products`}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {loading && Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={`supplier-product-skeleton-${index}`} />)}
        {!loading && products.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">{submittedSearch ? "No products match your search." : "No products found for this supplier."}</p>
          </div>
        )}
        {!loading && products.map((product) => (
          <CatalogueProductCard key={product.id} product={product} cartQuantity={quantityByProduct[product.id] ?? 0} onAdd={handleAdd} />
        ))}
      </section>

      {!loading && nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="outline" className="border-slate-200" disabled={loadingMore} onClick={() => { void fetchPage(nextCursor); }}>
            {loadingMore ? "Loading more..." : "Load more products"}
          </Button>
        </div>
      )}
    </ShopShell>
  );
}
