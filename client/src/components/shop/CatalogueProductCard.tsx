import { memo } from "react";
import { Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cardImage, cheapestOffer, formatMinor, type PublicProduct } from "@/lib/catalogueApi";
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
  const location = useLocation();
  const photoSrc = toPrerenderSafeImageSrc(cardImage(product));
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

  // The name link is stretched over the whole card (after:inset-0), so the card is one big tap target
  // while the add button stays a separate control instead of a button nested inside a link.
  return (
    <Card
      data-product-card-id={product.id}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-white sm:h-56">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            width={512}
            height={512}
            className="h-full w-full object-contain p-4 transition"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">No image</div>
        )}
        {regular ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
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
        <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2">
          <Link
            to={productHref}
            state={{ from: { pathname: location.pathname, search: location.search } }}
            className="rounded-sm after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#783F6A]"
            onClick={(event) => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
              onNavigate?.(product.id);
            }}
          >
            {product.name}
          </Link>
        </h3>
        {supplierLabel ? <p className="text-xs text-slate-500 line-clamp-1">By {supplierLabel}</p> : null}
        {variantLabel ? <p className="text-xs text-muted-foreground">{variantLabel}</p> : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-brand-green-dark">
              {product.variants.length > 1 || supplierCount > 1 ? "From " : ""}
              {formatMinor(product.minimumPriceMinor)}
            </span>
            {regular ? <span className="text-xs text-slate-400 line-through">{formatMinor(regular)}</span> : null}
          </div>
          {onAdd ? (
            <button
              type="button"
              onClick={() => onAdd(product)}
              aria-label={product.variants.length > 1 ? `Choose a size of ${product.name}` : `Add ${product.name} to cart`}
              className="relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#783F6A] text-sm font-semibold text-white sm:w-auto sm:px-4 transition-colors hover:bg-[#6a365d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#783F6A] focus-visible:ring-offset-2"
            >
              {/* Narrow phone cards only have room for the price and a round + button. */}
              <Plus className="h-5 w-5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">{product.variants.length > 1 ? "Choose" : "Add +"}</span>
            </button>
          ) : (
            <span className="text-xs font-semibold uppercase text-slate-400">View</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(CatalogueProductCard, (prev, next) =>
  prev.product === next.product
  && prev.cartQuantity === next.cartQuantity
  && prev.onAdd === next.onAdd
  && prev.onNavigate === next.onNavigate);
