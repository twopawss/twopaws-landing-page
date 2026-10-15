import { memo } from "react";
import { Info } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cheapestOffer, formatMinor, type PublicProduct } from "@/lib/catalogueApi";
import { productSlugPath } from "@/lib/catalogueTaxonomy";
import { toPrerenderSafeImageSrc } from "@/lib/prerenderImage";

type CatalogueProductCardProps = {
  product: PublicProduct;
  cartQuantity?: number;
  /** Called with the product; the parent decides whether to add the cheapest offer or open the page for a variant choice. */
  onAdd?: (product: PublicProduct) => void;
  onNavigate?: (productId: string) => void;
};

function CatalogueProductCard({ product, cartQuantity = 0, onAdd, onNavigate }: CatalogueProductCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const photoSrc = toPrerenderSafeImageSrc(product.images[0]);
  const offer = cheapestOffer(product);
  const supplierCount = product.supplierIds.length;
  const supplierLabel = supplierCount > 1
    ? `${supplierCount} suppliers`
    : offer?.supplierName ?? product.suppliers?.[0]?.name ?? undefined;
  const regular = offer?.regularPriceMinor && offer.regularPriceMinor > offer.sellingPriceMinor ? offer.regularPriceMinor : null;
  // A single variant whose label is just the product name again adds nothing to the card.
  const singleLabel = product.variants.length === 1 ? product.variants[0].label.trim() : "";
  const variantLabel = product.variants.length > 1
    ? `${product.variants.length} sizes`
    : singleLabel && singleLabel.toLowerCase() !== product.name.trim().toLowerCase() ? singleLabel : null;
  const productHref = productSlugPath(product.id, product.name);
  const isInCart = cartQuantity > 0;

  return (
    <Link
      to={productHref}
      className="block h-full"
      data-product-card-id={product.id}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        onNavigate?.(product.id);
      }}
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-white sm:h-56">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={product.name}
              width={512}
              height={512}
              className="h-full w-full object-contain p-4 transition"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">No image</div>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNavigate?.(product.id);
              navigate(productHref, { state: { from: { pathname: location.pathname, search: location.search } } });
            }}
            className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
            aria-label="View details"
          >
            <Info className="h-4 w-4" />
          </button>
          {regular ? (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Save {Math.round((1 - offer.sellingPriceMinor / regular) * 100)}%
            </span>
          ) : null}
          {isInCart && (
            <span className={`absolute ${regular ? "left-2 top-9" : "left-2 top-2"} rounded-full bg-brand-olive px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-dark`}>
              In cart: {cartQuantity}
            </span>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-1 p-4">
          {product.brand ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{product.brand}</p> : null}
          <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">{product.name}</h3>
          {supplierLabel ? <p className="text-xs text-slate-500 line-clamp-1">By {supplierLabel}</p> : null}
          {variantLabel ? <p className="text-xs text-muted-foreground">{variantLabel}</p> : null}

          <div className="mt-auto flex items-end justify-between pt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-green-dark">
                {product.variants.length > 1 || supplierCount > 1 ? "From " : ""}
                {formatMinor(product.minimumPriceMinor)}
              </span>
              {regular ? <span className="text-xs text-slate-400 line-through">{formatMinor(regular)}</span> : null}
            </div>
            {onAdd ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  onAdd(product);
                }}
                className="text-xs font-semibold uppercase text-red-500 hover:text-red-600"
              >
                {product.variants.length > 1 ? "Choose" : "Add +"}
              </button>
            ) : (
              <span className="text-xs font-semibold uppercase text-slate-400">View</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default memo(CatalogueProductCard, (prev, next) =>
  prev.product === next.product
  && prev.cartQuantity === next.cartQuantity
  && prev.onAdd === next.onAdd
  && prev.onNavigate === next.onNavigate);
