import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import ShopShell from "@/components/shop/ShopShell";
import CatalogueProductCard from "@/components/shop/CatalogueProductCard";
import { SupplierPicker } from "@/components/shop/SupplierPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaCustomEvent, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { TAXONOMY_PETS, brandSlugPath, categoriesForPet, categoryPath, findCategory, petByKey, productSlugPath, slugify } from "@/lib/catalogueTaxonomy";
import {
  browseProducts, callableCode, callableMessage, cheapestOffer, getFacets, suggest,
  type BrowseParams, type BrowseSort, type Facets, type PublicProduct, type Suggestion,
} from "@/lib/catalogueApi";

const PER_PAGE_OPTIONS = [12, 24, 48];
const PRODUCT_SKELETON_COUNT = 12;
const ELLIPSIS = "ellipsis" as const;
type PageItem = number | typeof ELLIPSIS;
const SORT_OPTIONS: { value: string; label: string; mode: BrowseSort }[] = [
  { value: "default", label: "Default", mode: "all" },
  { value: "price-asc", label: "Price: Low to High", mode: "low" },
  { value: "price-desc", label: "Price: High to Low", mode: "high" },
  { value: "sale", label: "On sale", mode: "sale" },
];
/** Pet-type shortcuts the backend understands next to the free-text supplier categories. */
const PET_FILTERS = [
  { value: "dogs", label: "Dogs" },
  { value: "cats", label: "Cats" },
  { value: "puppies", label: "Puppies" },
  { value: "kittens", label: "Kittens" },
];
const SHOP_SCROLL_KEY_PREFIX = "twopaws:shop:scroll:";

const getPageItems = (totalPages: number, currentPage: number): PageItem[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) if (page > 1 && page < totalPages) pages.add(page);
  if (currentPage <= 3) { pages.add(2); pages.add(3); }
  if (currentPage >= totalPages - 2) { pages.add(totalPages - 1); pages.add(totalPages - 2); }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    items.push(page);
    const next = sorted[index + 1];
    if (next && next - page > 1) items.push(ELLIPSIS);
  });
  return items;
};

const toMinor = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
};

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-3/4 rounded-full" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** Search box with catalogueSuggest completions while typing. */
export function CatalogueSearchBox({
  value, onChange, onSubmit, placeholder,
}: { value: string; onChange: (value: string) => void; onSubmit: (value: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const requestRef = useRef(0);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    const query = draft.trim();
    if (query.length < 2 || isReactSnapPrerender()) { setSuggestions([]); return; }
    const request = ++requestRef.current;
    const timer = window.setTimeout(() => {
      suggest(query).then((items) => { if (requestRef.current === request) setSuggestions(items); }).catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const commit = (next: string) => {
    setDraft(next);
    setOpen(false);
    onChange(next);
    onSubmit(next);
  };
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={draft}
        onChange={(event) => { setDraft(event.target.value); setOpen(true); onChange(event.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => { if (event.key === "Enter") commit(draft); if (event.key === "Escape") setOpen(false); }}
        placeholder={placeholder ?? "Search products, brands, and essentials..."}
        className="h-11 rounded-full border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-sm shadow-lg" role="listbox">
          {suggestions.map((item) => (
            <li key={`${item.kind}-${item.text}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50"
                onMouseDown={(event) => { event.preventDefault(); commit(item.text); }}
              >
                <span>{item.text}</span>
                <span className="text-xs text-slate-400">{item.kind === "phrase" ? "" : item.kind} · {item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CatalogueShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Landing modes: /shop/{pet}/{category}/ (taxonomy) and /shop/brand/{brand}/ share this page with /shop/.
  const { pet: petParam = "", category: categorySlug = "", brand: brandSlug = "" } = useParams();
  const taxonomyPet = petParam ? petByKey(petParam) : null;
  const taxonomyCategory = petParam && categorySlug ? findCategory(petParam, categorySlug) : null;
  const landingMissing = Boolean((petParam && !taxonomyPet) || (categorySlug && !taxonomyCategory));
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { add, quantityByProduct } = useCatalogueCart();
  const { suppliers, supplierMap, loading: suppliersLoading } = useSuppliers({ realtime: false });

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [submittedSearch, setSubmittedSearch] = useState(() => (searchParams.get("q") ?? "").trim());
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("cat") ?? "all");
  const [selectedBrand, setSelectedBrand] = useState(() => searchParams.get("brand") ?? "all");
  const [selectedSupplier, setSelectedSupplier] = useState(() => searchParams.get("supplier") ?? "all");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "default");
  const [minPrice, setMinPrice] = useState(() => searchParams.get("min") ?? "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("max") ?? "");
  const [appliedPrice, setAppliedPrice] = useState(() => ({ min: searchParams.get("min") ?? "", max: searchParams.get("max") ?? "" }));
  const [perPage, setPerPage] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("per") ?? "", 10);
    return PER_PAGE_OPTIONS.includes(parsed) ? parsed : 12;
  });
  const [page, setPage] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("page") ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [showAllCategories, setShowAllCategories] = useState(() => searchParams.get("cats") === "all");
  const [categoryOpen, setCategoryOpen] = useState(() => searchParams.get("category") !== "closed");
  const [priceOpen, setPriceOpen] = useState(() => searchParams.get("price") !== "closed");
  const [filtersOpen, setFiltersOpen] = useState(() => searchParams.get("filters") === "open");

  const [facets, setFacets] = useState<Facets | null>(null);
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cursorsRef = useRef<{ key: string; cursors: string[] }>({ key: "", cursors: [""] });
  const requestRef = useRef(0);
  const lastTrackedSearchRef = useRef("");
  const lastTrackedCategoryRef = useRef("");
  const hasRestoredScrollRef = useRef(false);

  useEffect(() => {
    if (isReactSnapPrerender()) return;
    getFacets()
      .then((data) => setFacets({ categories: Array.isArray(data.categories) ? data.categories : [], brands: Array.isArray(data.brands) ? data.brands : [], suppliers: Array.isArray(data.suppliers) ? data.suppliers : [] }))
      .catch(() => setFacets({ categories: [], brands: [], suppliers: [] }));
  }, []);

  const sortMode = SORT_OPTIONS.find((option) => option.value === sort)?.mode ?? "all";
  const browseParams = useMemo<BrowseParams>(() => ({
    limit: perPage,
    query: submittedSearch || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    brand: brandSlug || (selectedBrand !== "all" ? selectedBrand : undefined),
    supplierId: selectedSupplier !== "all" ? selectedSupplier : undefined,
    sortMode,
    minPriceMinor: toMinor(appliedPrice.min) || undefined,
    maxPriceMinor: toMinor(appliedPrice.max) || undefined,
    categories: taxonomyCategory?.raw,
    petType: taxonomyPet?.petType || undefined,
  }), [perPage, submittedSearch, selectedCategory, selectedBrand, brandSlug, selectedSupplier, sortMode, appliedPrice, taxonomyCategory, taxonomyPet]);
  const filterKey = JSON.stringify(browseParams);

  // Server paging: the cursor for page n is only known after page n-1 was fetched, so a jump walks
  // forward from the last known page. Cursors survive index changes (the server honours the offset),
  // but a cursor that no longer matches the filters comes back as "aborted"/"invalid-argument" and
  // the walk restarts from page 1.
  useEffect(() => {
    if (isReactSnapPrerender()) { setLoading(false); return; }
    const request = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    const run = async (retry: boolean): Promise<void> => {
      if (cursorsRef.current.key !== filterKey) cursorsRef.current = { key: filterKey, cursors: [""] };
      const cache = cursorsRef.current;
      const target = Math.max(1, page);
      let current = Math.min(target, cache.cursors.length);
      let data = null as Awaited<ReturnType<typeof browseProducts>> | null;
      try {
        while (current <= target) {
          const cursor = cache.cursors[current - 1];
          data = await browseProducts({ ...browseParams, cursor: cursor || undefined });
          if (requestRef.current !== request) return;
          if (data.nextCursor) cache.cursors[current] = data.nextCursor;
          if (!data.nextCursor || current === target) break;
          current += 1;
        }
      } catch (err) {
        if (requestRef.current !== request) return;
        const code = callableCode(err);
        if (!retry && (code === "aborted" || code === "invalid-argument")) {
          cursorsRef.current = { key: "", cursors: [""] };
          setPage(1);
          return run(true);
        }
        setLoadError(callableMessage(err, "Unable to load products right now."));
        setItems([]);
        setLoading(false);
        return;
      }
      if (!data) return;
      if (current !== target) setPage(current);
      setItems(data.items);
      setTotal(data.total);
      setLoading(false);
    };
    void run(false);
  }, [browseParams, filterKey, page]);

  useEffect(() => {
    const query = submittedSearch.trim();
    if (query.length < 2 || loading || total === null) { if (!query) lastTrackedSearchRef.current = ""; return; }
    const normalized = query.toLowerCase();
    if (lastTrackedSearchRef.current === normalized) return;
    trackMetaEvent("Search", { search_string: query, content_category: "products", result_count: total });
    lastTrackedSearchRef.current = normalized;
  }, [submittedSearch, loading, total]);

  useEffect(() => {
    if (selectedCategory === "all") { lastTrackedCategoryRef.current = ""; return; }
    if (lastTrackedCategoryRef.current === selectedCategory) return;
    trackMetaCustomEvent("ViewCategory", { category_id: selectedCategory, content_category: selectedCategory });
    lastTrackedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (submittedSearch) params.set("q", submittedSearch);
    if (selectedCategory !== "all") params.set("cat", selectedCategory);
    if (selectedBrand !== "all") params.set("brand", selectedBrand);
    if (selectedSupplier !== "all") { params.set("supplier", selectedSupplier); params.set("mode", "single"); }
    if (sort !== "default") params.set("sort", sort);
    if (appliedPrice.min) params.set("min", appliedPrice.min);
    if (appliedPrice.max) params.set("max", appliedPrice.max);
    if (perPage !== 12) params.set("per", String(perPage));
    if (page > 1) params.set("page", String(page));
    if (showAllCategories) params.set("cats", "all");
    if (!categoryOpen) params.set("category", "closed");
    if (!priceOpen) params.set("price", "closed");
    if (filtersOpen) params.set("filters", "open");
    const nextQuery = params.toString();
    const currentQuery = location.search.startsWith("?") ? location.search.slice(1) : location.search;
    if (nextQuery === currentQuery) return;
    setSearchParams(params, { replace: true });
  }, [submittedSearch, selectedCategory, selectedBrand, selectedSupplier, sort, appliedPrice, perPage, page, showAllCategories, categoryOpen, priceOpen, filtersOpen, location.search, setSearchParams]);

  const scrollStateKey = `${SHOP_SCROLL_KEY_PREFIX}${location.key}`;
  useEffect(() => { hasRestoredScrollRef.current = false; }, [scrollStateKey]);
  useEffect(() => {
    if (hasRestoredScrollRef.current || loading) return;
    hasRestoredScrollRef.current = true;
    const top = Number(window.sessionStorage.getItem(scrollStateKey));
    if (Number.isFinite(top) && top > 0) window.requestAnimationFrame(() => window.scrollTo({ top, behavior: "auto" }));
  }, [loading, scrollStateKey]);
  const handleProductNavigate = useCallback(() => {
    window.sessionStorage.setItem(scrollStateKey, String(window.scrollY));
  }, [scrollStateKey]);

  const handleAdd = useCallback(async (product: PublicProduct) => {
    if (product.variants.length > 1) {
      handleProductNavigate();
      navigate(productSlugPath(product.id, product.name));
      return;
    }
    const offer = cheapestOffer(product);
    if (!offer) return;
    try {
      await add(offer.id, 1);
      trackMetaEvent("AddToCart", {
        content_ids: [product.id], content_type: "product", content_name: product.name,
        value: offer.sellingPriceMinor / 100, currency: META_PIXEL_CURRENCY,
        contents: [{ id: product.id, quantity: 1, item_price: offer.sellingPriceMinor / 100 }],
      });
      toast({ title: "Added to cart", description: product.name });
    } catch (err) {
      toast({ title: "Add to cart failed", description: callableMessage(err, "Unable to add this item right now."), variant: "destructive" });
    }
  }, [add, navigate, toast, handleProductNavigate]);

  const resetPaging = () => setPage(1);
  const clearFilters = () => {
    setSelectedCategory("all"); setSelectedBrand("all"); setSelectedSupplier("all");
    setMinPrice(""); setMaxPrice(""); setAppliedPrice({ min: "", max: "" }); resetPaging();
  };

  const totalPages = total !== null ? Math.max(1, Math.ceil(total / perPage)) : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const showingFrom = items.length ? (currentPage - 1) * perPage + 1 : 0;
  const showingTo = items.length ? (currentPage - 1) * perPage + items.length : 0;
  const paginationItems = useMemo(() => getPageItems(totalPages, currentPage), [totalPages, currentPage]);
  const isSearching = submittedSearch.length > 0;
  const hasPriceFilter = Boolean(appliedPrice.min || appliedPrice.max);
  const activeFilterCount = (selectedCategory !== "all" ? 1 : 0) + (selectedBrand !== "all" ? 1 : 0) + (selectedSupplier !== "all" ? 1 : 0) + (hasPriceFilter ? 1 : 0);

  // Only suppliers with purchasable catalogue products are offered; without facets every active supplier is shown.
  const catalogueSupplierIds = useMemo(() => (Array.isArray(facets?.suppliers) ? new Set(facets.suppliers.map((s) => s.id)) : null), [facets]);
  const pickerSuppliers = useMemo(
    () => (catalogueSupplierIds ? suppliers.filter((s) => catalogueSupplierIds.has(s.id)) : suppliers),
    [suppliers, catalogueSupplierIds]
  );
  const categories = facets?.categories ?? [];
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 10);
  const hiddenCategoryCount = Math.max(categories.length - visibleCategories.length, 0);
  const brands = facets?.brands ?? [];

  const brandName = brandSlug ? (brands.find((b) => slugify(b.name) === brandSlug)?.name ?? items.find((p) => slugify(p.brand) === brandSlug)?.brand ?? brandSlug.replace(/-/g, " ")) : "";
  const landing = taxonomyCategory
    ? { title: `${taxonomyCategory.name} in Egypt | TwoPaws Shop`, h1: taxonomyCategory.name, intro: taxonomyCategory.description, path: categoryPath(taxonomyCategory), crumbs: [{ name: taxonomyPet?.name ?? petParam, path: `/shop/${petParam}/` }] }
    : taxonomyPet && !categorySlug
      ? { title: `${taxonomyPet.name} supplies in Egypt | TwoPaws Shop`, h1: `${taxonomyPet.name}: food, care and supplies`, intro: taxonomyPet.description, path: `/shop/${petParam}/`, crumbs: [] }
      : brandSlug
        ? { title: `${brandName} products in Egypt | TwoPaws Shop`, h1: brandName, intro: `Shop ${brandName} pet food and supplies at supplier prices on TwoPaws, with fast delivery in Cairo and Giza.`, path: brandSlugPath(brandSlug), crumbs: [] }
        : null;
  const shopDescription = landing ? landing.intro.slice(0, 155) : "Shop pet food, accessories, litter, toys, and wellness essentials from trusted TwoPaws suppliers in Egypt with fast delivery in Cairo and Giza.";
  const pageTitle = landing ? landing.title : "TwoPaws Shop | Pet Food, Supplies & Accessories in Egypt";
  const canonicalPath = landing ? landing.path : "/shop/";
  const structuredData = useMemo(() => [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: landing ? landing.h1 : "TwoPaws Shop", description: shopDescription, url: `${BASE_URL}${canonicalPath}`, isPartOf: { "@type": "WebSite", name: "TwoPaws", url: BASE_URL } },
    { "@context": "https://schema.org", "@type": "ItemList", name: landing ? `${landing.h1} products` : "TwoPaws Shop products", ...(total !== null ? { numberOfItems: total } : {}), itemListElement: items.slice(0, 24).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, url: `${BASE_URL}${productSlugPath(product.id, product.name)}` })) },
    ...(landing ? [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Shop", item: `${BASE_URL}/shop/` }, ...landing.crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 2, name: c.name, item: `${BASE_URL}${c.path}` })), { "@type": "ListItem", position: landing.crumbs.length + 2, name: landing.h1, item: `${BASE_URL}${canonicalPath}` }] }] : []),
  ], [items, total, landing, shopDescription, canonicalPath]);

  const headerSearch = (
    <div className="mx-auto flex w-full max-w-[980px] items-center gap-2">
      <CatalogueSearchBox
        value={search}
        onChange={setSearch}
        onSubmit={(value) => { setSubmittedSearch(value.trim()); resetPaging(); }}
      />
      <Button variant="outline" className="border-slate-200 lg:hidden" onClick={() => setFiltersOpen((prev) => !prev)} aria-label="Toggle filters">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
      {search.trim() && search.trim() !== submittedSearch && (
        <Button className="bg-brand-green-dark text-white" onClick={() => { setSubmittedSearch(search.trim()); resetPaging(); }}>Search</Button>
      )}
      {isSearching && (
        <Button variant="outline" className="hidden border-slate-200 sm:inline-flex" onClick={() => { setSearch(""); setSubmittedSearch(""); resetPaging(); }}>Clear</Button>
      )}
    </div>
  );

  return (
    <ShopShell headerContent={headerSearch}>
      <Seo title={landingMissing ? "Page not found | TwoPaws Shop" : pageTitle} description={shopDescription} canonicalUrl={canonicalPath} ogType="website" structuredData={landingMissing ? undefined : structuredData} noIndex={landingMissing} />
      {landingMissing ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">This shop page does not exist</h1>
          <Button asChild className="bg-brand-green-dark text-white"><Link to="/shop/">Browse the shop</Link></Button>
        </div>
      ) : null}
      {landing && !landingMissing ? (
        <header className="space-y-3">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <Link to="/shop/" className="hover:underline">Shop</Link>
            {landing.crumbs.map((c) => <span key={c.path}> › <Link to={c.path} className="hover:underline">{c.name}</Link></span>)}
            <span> › {landing.h1}</span>
          </nav>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{landing.h1}</h1>
          <p className="max-w-3xl text-slate-600">{landing.intro}</p>
          {taxonomyPet ? (
            <div className="flex flex-wrap gap-2">
              {categoriesForPet(petParam).map((c) => (
                <Link key={c.slug} to={categoryPath(c)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${c.slug === categorySlug ? "border-brand-dark bg-brand-light text-brand-dark" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>{c.name}</Link>
              ))}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className={`grid min-w-0 gap-6 lg:grid-cols-[280px_1fr] ${landingMissing ? "hidden" : ""}`}>
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between lg:hidden">
            <p className="text-sm font-semibold text-slate-800">Filters</p>
            <Button variant="outline" className="border-slate-200" onClick={() => setFiltersOpen((prev) => !prev)}>{filtersOpen ? "Hide" : "Show"}</Button>
          </div>
          <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{activeFilterCount > 0 ? `${activeFilterCount} active filters` : "No active filters"}</span>
              {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="font-semibold text-brand-green-dark hover:underline">Clear all</button>}
            </div>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Pet</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PET_FILTERS.map((pet) => (
                    <button
                      key={pet.value}
                      type="button"
                      onClick={() => { setSelectedCategory(selectedCategory === pet.value ? "all" : pet.value); resetPaging(); }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedCategory === pet.value ? "border-brand-dark bg-brand-light text-brand-dark" : "border-slate-200 text-slate-700"}`}
                    >
                      {pet.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" className="flex w-full items-center justify-between text-sm font-semibold text-slate-800" onClick={() => setCategoryOpen((v) => !v)}>
                  Categories {categoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {categoryOpen && (
                  <div className="mt-3 space-y-4">
                    <Link to="/shop/" className={`block text-sm ${!landing && selectedCategory === "all" ? "font-semibold text-brand-dark" : "text-slate-800 hover:underline"}`}>All items</Link>
                    {selectedCategory !== "all" && (
                      <p className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                        <span>Category: {selectedCategory}</span>
                        <button type="button" className="font-semibold text-brand-green-dark" onClick={() => { setSelectedCategory("all"); resetPaging(); }}>Clear</button>
                      </p>
                    )}
                    {TAXONOMY_PETS.map((pet) => (
                      <div key={pet.key}>
                        <Link to={`/shop/${pet.key}/`} className={`text-xs font-semibold uppercase tracking-wide ${petParam === pet.key && !categorySlug ? "text-brand-dark" : "text-slate-500 hover:underline"}`}>{pet.name}</Link>
                        <ul className="mt-1 space-y-1">
                          {categoriesForPet(pet.key).slice(0, showAllCategories ? undefined : 6).map((c) => (
                            <li key={c.slug}>
                              <Link to={categoryPath(c)} className={`text-sm ${taxonomyCategory === c ? "font-semibold text-brand-dark" : "text-slate-800 hover:underline"}`}>{c.name}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {!showAllCategories && <button type="button" onClick={() => setShowAllCategories(true)} className="text-sm font-semibold text-brand-green-dark">Show all categories</button>}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Brand</p>
                <Select value={brandSlug ? slugify(brandName) : selectedBrand} onValueChange={(value) => { if (brandSlug) { navigate(value === "all" ? "/shop/" : brandSlugPath(value)); return; } setSelectedBrand(value); resetPaging(); }}>
                  <SelectTrigger className="mt-2 h-9"><SelectValue placeholder="All brands" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brands.slice(0, 80).map((brand) => <SelectItem key={brand.name} value={brandSlug ? slugify(brand.name) : brand.name}>{brand.name} ({brand.count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <button type="button" className="flex w-full items-center justify-between text-sm font-semibold text-slate-800" onClick={() => setPriceOpen((v) => !v)}>
                  Filter by Price {priceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {priceOpen && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-9" />
                      <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-9" />
                    </div>
                    <button type="button" onClick={() => { setAppliedPrice({ min: minPrice.trim(), max: maxPrice.trim() }); resetPaging(); }} className="w-full rounded-md bg-brand-green-dark px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90">FILTER</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">
                {isSearching ? `Results for "${submittedSearch}" (${total ?? "…"})` : `Total items: ${total ?? "…"}`}
              </span>
              {loading && <span className="text-xs text-slate-500">Loading products...</span>}
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select value={String(perPage)} onValueChange={(value) => { setPerPage(Number(value)); resetPaging(); }}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{PER_PAGE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                <span>Sort by</span>
                <Select value={sort} onValueChange={(value) => { setSort(value); resetPaging(); }}>
                  <SelectTrigger className="h-8 w-full sm:w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </header>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-800">Available Shops</p>
              <p className="text-xs text-slate-500">Shop across all shops or lock to one shop.</p>
            </div>
            <div className="mt-3">
              <SupplierPicker
                suppliers={pickerSuppliers}
                selectedSupplierId={selectedSupplier}
                supplierMode={selectedSupplier === "all" ? "all" : "single"}
                loading={suppliersLoading || !facets}
                onSelectAll={() => { setSelectedSupplier("all"); resetPaging(); }}
                onSelectSupplier={(supplierId) => { setSelectedSupplier(supplierId); resetPaging(); }}
              />
              <p className="mt-3 text-xs text-slate-500">
                Looking for a specific store? <Link to="/shop/suppliers/" className="font-semibold text-brand-green-dark hover:underline">Browse all supplier pages</Link>
                {selectedSupplier !== "all" && supplierMap[selectedSupplier]?.name ? ` · Showing ${supplierMap[selectedSupplier]?.name}` : ""}.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {loading && Array.from({ length: PRODUCT_SKELETON_COUNT }).map((_, index) => <ProductCardSkeleton key={`product-skeleton-${index}`} />)}
            {!loading && loadError && (
              <div className="col-span-full rounded-2xl border border-dashed border-red-300 bg-red-50 p-6 text-center">
                <p className="text-sm font-semibold text-red-700">{loadError}</p>
                <Button variant="outline" className="mt-4 border-slate-200" onClick={() => setPage((p) => p)}>Try again</Button>
              </div>
            )}
            {!loading && !loadError && items.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">{isSearching ? "No products match your search." : "No products found."}</p>
                <p className="mt-1 text-xs text-slate-500">{isSearching ? "Try a different product name or brand." : "Try a different search term or reset your filters."}</p>
                {isSearching && <Button variant="outline" className="mt-4 border-slate-200" onClick={() => { setSearch(""); setSubmittedSearch(""); resetPaging(); }}>Clear search</Button>}
                {activeFilterCount > 0 && <Button variant="outline" className="mt-4 border-slate-200" onClick={clearFilters}>Clear filters</Button>}
              </div>
            )}
            {!loading && items.map((product) => (
              <CatalogueProductCard key={product.id} product={product} cartQuantity={quantityByProduct[product.id] ?? 0} onAdd={handleAdd} onNavigate={handleProductNavigate} />
            ))}
          </section>

          <footer className="flex flex-wrap items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="flex items-center justify-center gap-2">
              <button type="button" className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex items-center gap-1">
                {paginationItems.map((item, index) => item === ELLIPSIS
                  ? <span key={`ellipsis-${index}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">...</span>
                  : <button key={item} type="button" onClick={() => setPage(item)} aria-current={currentPage === item ? "page" : undefined} className={`h-8 w-8 rounded-md border text-sm ${currentPage === item ? "border-brand-dark text-brand-dark" : "border-slate-200 text-slate-700"}`}>{item}</button>)}
              </div>
              <button type="button" className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={loading || currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="text-xs text-slate-500">{total !== null ? `Showing ${showingFrom}-${showingTo} of ${total}` : "Loading..."}</div>
          </footer>
        </div>
      </div>
    </ShopShell>
  );
}
