import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

// Every route except the landing page is code-split. The Firebase-backed routes additionally sit
// under FirebaseShell (a lazy layout route), so the Firebase SDK is not downloaded or initialised
// until one of them renders.
const FirebaseShell = lazy(() => import("@/app/FirebaseShell"));
const AboutPage = lazy(() => import("@/pages/marketing/about"));
const ContactPage = lazy(() => import("@/pages/marketing/contact"));
const ShippingReturnsPage = lazy(() => import("@/pages/marketing/shipping-returns"));
const EgyptPage = lazy(() => import("@/pages/marketing/egypt"));
const FeaturesPage = lazy(() => import("@/pages/marketing/features"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const DeleteAccount = lazy(() => import("@/pages/delete-account"));
const ForgotPasswordPage = lazy(() =>
  import("@/pages/password-reset").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/password-reset").then((m) => ({ default: m.ResetPasswordPage })),
);
const DownloadRedirect = lazy(() => import("@/pages/download"));
const ShopPage = lazy(() => import("@/pages/shop"));
const SuppliersPage = lazy(() => import("@/pages/shop/suppliers"));
const SupplierShopPage = lazy(() => import("@/pages/shop/supplier"));
const ProductDetailPage = lazy(() => import("@/pages/shop/product"));
const CatalogueShopPage = lazy(() => import("@/pages/shop/catalogue"));
const CatalogueSupplierPage = lazy(() => import("@/pages/shop/catalogue/supplier"));
const CatalogueProductPage = lazy(() => import("@/pages/shop/catalogue/product"));
const CartPage = lazy(() => import("@/pages/cart"));
const CatalogueCartPage = lazy(() => import("@/pages/catalogue-cart"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const CatalogueCheckoutPage = lazy(() => import("@/pages/catalogue-checkout"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const OrderDetailPage = lazy(() => import("@/pages/order-detail"));
const AccountPage = lazy(() => import("@/pages/account"));
const LoginPage = lazy(() => import("@/pages/login"));
const PaymobPaymentPage = lazy(() => import("@/pages/payment/paymob"));
const PaymentReturnPage = lazy(() => import("@/pages/payment/return"));
const CataloguePaymentReturnPage = lazy(() => import("@/pages/payment/catalogue-return"));
const EventsIndexPage = lazy(() => import("@/pages/events/index"));
const PublicEventPage = lazy(() => import("@/pages/events/event-public"));
const EventEntryPage = lazy(() => import("@/pages/events/enter"));
const EventLeaderboardPage = lazy(() => import("@/pages/events/leaderboard"));
const EventPaymentResultPage = lazy(() => import("@/pages/events/payment-result"));
const EventOrdersPage = lazy(() => import("@/pages/events/event-orders"));
const EventTicketDetailPage = lazy(() => import("@/pages/events/ticket-detail"));
const OrganizerPage = lazy(() => import("@/pages/organizer/organizer"));

/** Shown while a route chunk downloads. Kept minimal so it never competes with the page itself. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple/20 border-t-brand-purple" />
    </div>
  );
}

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
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <Toaster />
            <MetaPixelTracker />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/egypt" element={<EgyptPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/shipping-and-returns" element={<ShippingReturnsPage />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/download" element={<DownloadRedirect />} />
                <Route element={<FirebaseShell />}>
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/shop" element={<ShopIndexPage />} />
                  <Route path="/shop/suppliers" element={<SuppliersPage />} />
                  <Route path="/shop/supplier/:supplierId" element={<SupplierPage />} />
                  <Route path="/shop/product/:productId" element={<ProductLinkPage />} />
                  {isCatalogueShop && <Route path="/shop/brand/:brand" element={<CatalogueShopPage />} />}
                  {isCatalogueShop && <Route path="/shop/:pet" element={<CatalogueShopPage />} />}
                  {isCatalogueShop && <Route path="/shop/:pet/:category" element={<CatalogueShopPage />} />}
                  <Route path="/cart" element={<CartRoutePage />} />
                  <Route path="/checkout" element={<CheckoutRoutePage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/payment/paymob" element={<PaymobPaymentPage />} />
                  <Route path="/payment/return" element={<PaymentReturnRoutePage />} />
                  <Route path="/events" element={<EventsIndexPage />} />
                  <Route path="/events/:eventSlug" element={<PublicEventPage />} />
                  <Route path="/events/:eventSlug/checkout" element={<PublicEventPage />} />
                  <Route path="/events/:eventSlug/payment-result" element={<EventPaymentResultPage />} />
                  <Route path="/events/:eventSlug/leaderboard" element={<EventLeaderboardPage />} />
                  <Route path="/events/:eventSlug/enter" element={<EventEntryPage />} />
                  <Route path="/account/event-orders" element={<EventOrdersPage />} />
                  <Route path="/account/event-tickets/:ticketId" element={<EventTicketDetailPage />} />
                  <Route path="/organizer" element={<OrganizerPage />} />
                  <Route path="/organizer/events" element={<OrganizerPage />} />
                  <Route path="/organizer/events/:eventId" element={<OrganizerPage />} />
                  <Route path="/organizer/events/:eventId/:section" element={<OrganizerPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
