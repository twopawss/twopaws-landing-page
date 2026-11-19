import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Home, Ticket, XCircle } from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { getEventOrderStatus } from "@/features/events/api";
import { getGuestOrderAccess } from "@/features/events/guestAccess";
import { errorMessage, money } from "@/features/events/format";
import type { EventOrderStatus } from "@/features/events/types";
import Seo from "@/lib/seo/Seo";

const terminal = new Set([
  "PAID",
  "PAYMENT_FAILED",
  "EXPIRED",
  "CANCELLED",
  "PAID_AFTER_EXPIRY",
  "REFUNDED",
]);

export default function EventPaymentResultPage() {
  const { eventSlug = "" } = useParams();
  const [params] = useSearchParams();
  const orderId =
    params.get("orderId") ||
    params.get("special_reference") ||
    params.get("merchant_order_id") ||
    sessionStorage.getItem("twopaws:pending-event-order") ||
    "";
  const guestAccess = orderId ? getGuestOrderAccess(orderId) : null;
  const [order, setOrder] = useState<EventOrderStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let timer = 0;
    const poll = async () => {
      try {
        const result = await getEventOrderStatus(
          orderId,
          guestAccess?.guestCheckoutToken
        );
        if (!active) return;
        setOrder(result);
        setError("");
        if (!terminal.has(result.status)) {
          timer = window.setTimeout(poll, 2500);
        }
      } catch (reason) {
        if (!active) return;
        setError(errorMessage(reason));
        timer = window.setTimeout(poll, 4000);
      }
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [guestAccess?.guestCheckoutToken, orderId]);

  const paid = order?.status === "PAID";
  const failed = order && terminal.has(order.status) && !paid;

  return (
    <EventShell>
      <Seo title="Event Payment Status | TwoPaws" description="Your verified event ticket payment status." canonicalUrl={`/events/${eventSlug}/payment-result`} noIndex />
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-12 text-center">
        {!orderId ? (
          <>
            <XCircle className="h-20 w-20 text-red-500" />
            <h1 className="mt-6 text-4xl">Order reference missing</h1>
            <p className="mt-3 text-slate-600">Return to the event and start checkout again.</p>
          </>
        ) : paid ? (
          <>
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-20 w-20 text-emerald-600" />
            </span>
            <h1 className="mt-7 text-5xl">You’re going to the event!</h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Your Paymob payment was verified and {order.totalQuantity === 1 ? "your ticket is" : `your ${order.totalQuantity} tickets are`} ready.
            </p>
            <div className="mt-8 w-full rounded-2xl border border-slate-200 p-6 text-left">
              <div className="flex items-center gap-3"><Ticket className="h-7 w-7 text-brand-dark" /><h2 className="text-2xl">Ticket purchase</h2></div>
              <div className="mt-5 flex justify-between border-t border-slate-200 pt-5"><span>Total paid</span><strong>{money(order.totalMinor, order.currency)}</strong></div>
            </div>
          </>
        ) : failed ? (
          <>
            <XCircle className="h-24 w-24 text-red-500" />
            <h1 className="mt-6 text-5xl">Payment wasn’t completed</h1>
            <p className="mt-4 text-lg text-slate-600">No tickets were issued. Any held capacity will be released automatically.</p>
            <p className="mt-2 text-sm font-semibold text-red-600">{order.status.replaceAll("_", " ")}</p>
          </>
        ) : (
          <>
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-cream">
              <Clock3 className="h-16 w-16 animate-pulse text-brand-dark" />
            </span>
            <h1 className="mt-7 text-5xl">Processing your payment</h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Paymob has returned you to TwoPaws. We’re waiting for the secure verified confirmation before issuing tickets.
            </p>
          </>
        )}
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {paid && (
            <Button asChild className="bg-brand-olive font-bold text-brand-dark hover:bg-brand-olive/90">
              <Link to={`/account/event-orders?orderId=${orderId}`}><Ticket className="mr-2 h-4 w-4" />View my tickets</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="border-brand-dark text-brand-dark">
            <Link to="/"><Home className="mr-2 h-4 w-4" />Return home</Link>
          </Button>
          {!paid && failed && (
            <Button asChild className="bg-brand-dark text-white"><Link to={`/events/${eventSlug}`}>Try again</Link></Button>
          )}
        </div>
      </div>
    </EventShell>
  );
}
