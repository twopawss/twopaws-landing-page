import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CatalogueCartProvider } from "@/hooks/useCatalogueCart";
import { isCatalogueShop } from "@/lib/shopBackend";
import {
  initMetaPixel,
  persistMetaClickId,
  trackMetaCustomEvent,
  trackMetaEvent,
  trackPageView,
} from "@/lib/metaPixel";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { ANDROID_STORE_URL, IOS_STORE_URL } from "@/lib/seo/constants";
import Landing from "@/pages/landing";
import AboutPage from "@/pages/marketing/about";
import ContactPage from "@/pages/marketing/contact";
import EgyptPage from "@/pages/marketing/egypt";
import FeaturesPage from "@/pages/marketing/features";
import NotFound from "@/pages/not-found";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import DeleteAccount from "@/pages/delete-account";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/password-reset";
import DownloadRedirect from "@/pages/download";
import ShopPage from "@/pages/shop";
import SuppliersPage from "@/pages/shop/suppliers";
import SupplierShopPage from "@/pages/shop/supplier";
import ProductDetailPage from "@/pages/shop/product";
import CatalogueShopPage from "@/pages/shop/catalogue";
import CatalogueSupplierPage from "@/pages/shop/catalogue/supplier";
import CatalogueProductPage from "@/pages/shop/catalogue/product";
import CartPage from "@/pages/cart";
import CatalogueCartPage from "@/pages/catalogue-cart";
import CheckoutPage from "@/pages/checkout";
import CatalogueCheckoutPage from "@/pages/catalogue-checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import AccountPage from "@/pages/account";
import LoginPage from "@/pages/login";
import PaymobPaymentPage from "@/pages/payment/paymob";
import PaymentReturnPage from "@/pages/payment/return";
import CataloguePaymentReturnPage from "@/pages/payment/catalogue-return";
import PublicEventPage from "@/pages/events/event-public";
import EventLeaderboardPage from "@/pages/events/leaderboard";
import EventPaymentResultPage from "@/pages/events/payment-result";
import EventOrdersPage from "@/pages/events/event-orders";
import EventTicketDetailPage from "@/pages/events/ticket-detail";
import OrganizerPage from "@/pages/organizer/organizer";

const normalizePath = (path: string) => {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
};

const iosStoreUrl = new URL(IOS_STORE_URL);
const androidStoreUrl = new URL(ANDROID_STORE_URL);

const isSameOriginAndPath = (left: URL, right: URL) =>
  left.origin.toLowerCase() === right.origin.toLowerCase() &&
  normalizePath(left.pathname).toLowerCase() === normalizePath(right.pathname).toLowerCase();

function MetaPixelTracker() {
  const location = useLocation();
  const enablePixel = import.meta.env.PROD && !isReactSnapPrerender();

  useEffect(() => {
    if (!enablePixel || normalizePath(location.pathname).toLowerCase() === "/reset-password") return;
    initMetaPixel();
  }, [enablePixel, location.pathname]);

  useEffect(() => {
    if (!enablePixel || normalizePath(location.pathname).toLowerCase() === "/reset-password") return;
    persistMetaClickId();
    trackPageView();
  }, [enablePixel, location.pathname, location.search]);

  useEffect(() => {
    if (!enablePixel || normalizePath(location.pathname).toLowerCase() === "/reset-password") return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const href = link.getAttribute("href");
      if (!href) return;

      let destinationUrl: URL;
      try {
        destinationUrl = new URL(href, window.location.origin);
      } catch {
        return;
      }

      if (destinationUrl.protocol === "mailto:") {
        trackMetaEvent("Contact", {
          contact_method: "email",
          destination: destinationUrl.href,
          source_path: normalizePath(location.pathname),
        });
        return;
      }

      const matchesIosStore = isSameOriginAndPath(destinationUrl, iosStoreUrl);
      const matchesAndroidStore =
        isSameOriginAndPath(destinationUrl, androidStoreUrl) &&
        destinationUrl.searchParams.get("id") ===
          androidStoreUrl.searchParams.get("id");
      if (!matchesIosStore && !matchesAndroidStore) return;

      trackMetaCustomEvent("AppStoreClick", {
        lead_type: "app_download",
        platform: matchesIosStore ? "ios" : "android",
        destination: destinationUrl.href,
        source_path: normalizePath(location.pathname),
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [enablePixel, location.pathname]);

  return null;
}

// Shop pages are chosen once from the build-time VITE_SHOP_BACKEND flag (see lib/shopBackend.ts).
// On the legacy backend, catalogue product ids (product_*) still render the catalogue page in view-only mode.
function ProductLinkPage() {
  const { productId = "" } = useParams();
  if (isCatalogueShop || productId.startsWith("product_")) return <CatalogueProductPage />;
  return <ProductDetailPage />;
}
const ShopIndexPage = isCatalogueShop ? CatalogueShopPage : ShopPage;
const SupplierPage = isCatalogueShop ? CatalogueSupplierPage : SupplierShopPage;
const CartRoutePage = isCatalogueShop ? CatalogueCartPage : CartPage;
const CheckoutRoutePage = isCatalogueShop ? CatalogueCheckoutPage : CheckoutPage;
const PaymentReturnRoutePage = isCatalogueShop ? CataloguePaymentReturnPage : PaymentReturnPage;
/** The legacy cart provider stays mounted on the legacy backend only; the catalogue cart is always available for product_* pages. */
function ShopProviders({ children }: { children: React.ReactNode }) {
  if (isCatalogueShop) return <CatalogueCartProvider>{children}</CatalogueCartProvider>;
  return <CartProvider>{children}</CartProvider>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <AuthProvider>
            <ShopProviders>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <Toaster />
                <MetaPixelTracker />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/egypt" element={<EgyptPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/download" element={<DownloadRedirect />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/shop" element={<ShopIndexPage />} />
                  <Route path="/shop/suppliers" element={<SuppliersPage />} />
                  <Route path="/shop/supplier/:supplierId" element={<SupplierPage />} />
                  <Route path="/shop/product/:productId" element={<ProductLinkPage />} />
                  <Route path="/cart" element={<CartRoutePage />} />
                  <Route path="/checkout" element={<CheckoutRoutePage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/payment/paymob" element={<PaymobPaymentPage />} />
                  <Route path="/payment/return" element={<PaymentReturnRoutePage />} />
                  <Route path="/events/:eventSlug" element={<PublicEventPage />} />
                  <Route path="/events/:eventSlug/checkout" element={<PublicEventPage />} />
                  <Route path="/events/:eventSlug/payment-result" element={<EventPaymentResultPage />} />
                  <Route path="/events/:eventSlug/leaderboard" element={<EventLeaderboardPage />} />
                  <Route path="/account/event-orders" element={<EventOrdersPage />} />
                  <Route path="/account/event-tickets/:ticketId" element={<EventTicketDetailPage />} />
                  <Route path="/organizer" element={<OrganizerPage />} />
                  <Route path="/organizer/events" element={<OrganizerPage />} />
                  <Route path="/organizer/events/:eventId" element={<OrganizerPage />} />
                  <Route path="/organizer/events/:eventId/:section" element={<OrganizerPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ShopProviders>
          </AuthProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
