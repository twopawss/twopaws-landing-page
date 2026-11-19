import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { createMetaEventId, META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import { callableMessage, cartCall, formatMinor, type OrderStatus } from "@/lib/catalogueApi";
import Seo from "@/lib/seo/Seo";

const PAYMOB_GUEST_TOKEN_STORAGE_PREFIX = "twopaws:paymob:guest-token:";
const GUEST_PENDING_ORDER_STORAGE_KEY = "twopaws:guest-checkout:pending-order";
const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT = 40;

const describe = (status: OrderStatus | null) => {
  if (!status) return { title: "Checking your order...", body: "This takes a few seconds." };
  if (status.paid) return { title: "Payment received", body: `Order #${status.orderNumber} is confirmed. Thank you!` };
  if (status.paymentMethod === "cash") return { title: "Order placed", body: `Order #${status.orderNumber} will be paid in cash on delivery.` };
  const state = String(status.paymentStatus || status.status || "").toUpperCase();
  if (state.includes("FAILED")) return { title: "Payment failed", body: "Your card was not charged. You can try again from the order page." };
  if (state.includes("EXPIRED")) return { title: "Payment session expired", body: "The reservation was released. Place the order again." };
  return { title: "Waiting for payment confirmation", body: "Paymob is confirming your payment. Keep this page open." };
};

/** Payment return for catalogue (v3) orders: polls catalogueCart orderStatus instead of reading the order document. */
export default function CataloguePaymentReturnPage() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { clear } = useCatalogueCart();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const orderId = params.get("orderId") || params.get("merchant_order_id") || params.get("special_reference") || null;
  const eventSlug = params.get("eventSlug") || window.sessionStorage.getItem("twopaws:pending-event-slug");
  const pendingEventOrder = window.sessionStorage.getItem("twopaws:pending-event-order");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const trackedRef = useRef<string | null>(null);
  const clearedRef = useRef<string | null>(null);

  const guestToken = orderId ? window.sessionStorage.getItem(`${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${orderId}`) ?? undefined : undefined;
  const terminal = Boolean(status && (status.paid || !status.requiresPayment));

  useEffect(() => {
    if (!orderId || authLoading || terminal || attempts >= POLL_LIMIT) return;
    let cancelled = false;
    const run = async () => {
      try {
        const next = await cartCall<OrderStatus>({ operation: "orderStatus", orderId, guestCheckoutToken: user ? undefined : guestToken });
        if (cancelled) return;
        setStatus(next);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(callableMessage(err, "Unable to read the order status."));
      }
    };
    const timer = window.setTimeout(() => { void run().finally(() => { if (!cancelled) setAttempts((n) => n + 1); }); }, attempts === 0 ? 0 : POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [orderId, authLoading, user, guestToken, terminal, attempts]);

  useEffect(() => {
    if (!orderId || !status?.paid || trackedRef.current === orderId) return;
    trackMetaEvent("Purchase", { value: status.totalMinor / 100, currency: META_PIXEL_CURRENCY, order_id: orderId, payment_method: status.paymentMethod }, { eventId: createMetaEventId("Purchase", orderId) });
    trackedRef.current = orderId;
  }, [orderId, status]);

  // A guest's browser cart is cleared only once the server confirms the card payment (cash orders clear at checkout).
  useEffect(() => {
    if (!orderId || !status?.paid || clearedRef.current === orderId) return;
    if (window.sessionStorage.getItem(GUEST_PENDING_ORDER_STORAGE_KEY) !== orderId) return;
    clearedRef.current = orderId;
    clear().then(() => window.sessionStorage.removeItem(GUEST_PENDING_ORDER_STORAGE_KEY)).catch(() => { clearedRef.current = null; });
  }, [clear, orderId, status]);

  const eventOrderId = orderId || pendingEventOrder;
  if (eventSlug && eventOrderId && (pendingEventOrder || params.get("eventOrder") === "true")) {
    return <Navigate replace to={`/events/${encodeURIComponent(eventSlug)}/payment-result?orderId=${encodeURIComponent(eventOrderId)}`} />;
  }

  const copy = describe(status);
  return (
    <ShopShell>
      <Seo title="Payment Status | TwoPaws Shop" description="View your TwoPaws payment result." canonicalUrl="/payment/return/" noIndex />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Payment</p>
        <h1 className="text-3xl font-semibold text-slate-900">{copy.title}</h1>
      </header>
      <Card className="border-slate-100">
        <CardContent className="space-y-3 p-6">
          {!orderId ? <p className="text-slate-600">Missing order reference.</p> : (
            <>
              <p className="text-slate-600">{copy.body}</p>
              {status && <p className="text-sm text-slate-500">Total {formatMinor(status.totalMinor)} · {status.paymentMethod === "cash" ? "Cash on delivery" : "Card"}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {!terminal && attempts >= POLL_LIMIT && <p className="text-sm text-slate-500">Still waiting. Check the order page later or contact support with order {orderId}.</p>}
              <div className="flex flex-wrap gap-3">
                {user && <Button asChild className="bg-brand-green-dark text-white"><Link to={`/orders/${orderId}`}>View order</Link></Button>}
                {status && status.requiresPayment && !status.paid && <Button asChild variant="outline" className="border-slate-200"><Link to={`/payment/paymob?orderId=${encodeURIComponent(orderId)}`}>Retry payment</Link></Button>}
                <Button asChild variant="outline" className="border-slate-200"><Link to="/shop/">Continue shopping</Link></Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </ShopShell>
  );
}
