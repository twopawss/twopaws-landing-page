import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CatalogueCartProvider } from "@/hooks/useCatalogueCart";
import { isCatalogueShop } from "@/lib/shopBackend";

/**
 * Layout route for every page that needs Firebase (auth, cart, orders, events, organizer).
 * It is loaded with React.lazy from App.tsx, so the Firebase SDK and the providers only reach
 * the browser when one of those routes renders; the landing and marketing pages never pull it in.
 *
 * The legacy cart provider stays mounted on the legacy backend only; the catalogue cart is
 * always available for product_* pages.
 */
function ShopProviders({ children }: { children: React.ReactNode }) {
  if (isCatalogueShop) return <CatalogueCartProvider>{children}</CatalogueCartProvider>;
  return <CartProvider>{children}</CartProvider>;
}

export default function FirebaseShell() {
  return (
    <AuthProvider>
      <ShopProviders>
        <Outlet />
      </ShopProviders>
    </AuthProvider>
  );
}
