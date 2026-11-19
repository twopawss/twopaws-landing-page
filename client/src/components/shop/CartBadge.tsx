import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { isCatalogueShop } from "@/lib/shopBackend";

function Badge({ itemCount }: { itemCount: number }) {
  return (
    <Link
      to="/cart"
      className="relative inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 hover:border-brand-green-dark hover:text-brand-green-dark"
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-brand-olive px-1.5 text-xs font-semibold text-brand-dark">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

function LegacyCartBadge() {
  const { cart } = useCart();
  return <Badge itemCount={cart?.itemCount ?? 0} />;
}

function CatalogueCartBadge() {
  const { itemCount } = useCatalogueCart();
  return <Badge itemCount={itemCount} />;
}

/** The header cart icon; picks the cart implementation once from the build-time shop backend. */
const CartBadge = isCatalogueShop ? CatalogueCartBadge : LegacyCartBadge;
export default CartBadge;
