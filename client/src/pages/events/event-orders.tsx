import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { ChevronRight, Ticket } from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  getEventOrderStatus,
  getEventOrderTickets,
} from "@/features/events/api";
import {
  getGuestOrderAccess,
  listGuestOrders,
} from "@/features/events/guestAccess";
import { eventDate, money } from "@/features/events/format";
import type { EventOrderStatus } from "@/features/events/types";
import Seo from "@/lib/seo/Seo";

type TicketResult = Awaited<ReturnType<typeof getEventOrderTickets>>["tickets"][number];

export default function EventOrdersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const selectedOrderId = params.get("orderId");
  const [orders, setOrders] = useState<EventOrderStatus[]>([]);
  const [tickets, setTickets] = useState<Record<string, TicketResult[]>>({});
  const guestOrders = useMemo(() => listGuestOrders(), []);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let active = true;
    if (user) {
      const q = query(collection(db, "eventOrders"), where("buyerUid", "==", user.uid));
      cleanups.push(
        onSnapshot(q, (snap) => {
          setOrders(
            snap.docs
              .map((orderDoc) => ({ orderId: orderDoc.id, ...orderDoc.data() } as unknown as EventOrderStatus))
              .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          );
        })
      );
    } else {
      Promise.all(
        guestOrders.map((access) =>
          getEventOrderStatus(access.orderId, access.guestCheckoutToken)
        )
      ).then((results) => active && setOrders(results)).catch(() => undefined);
    }
    return () => {
      active = false;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [guestOrders, user]);

  useEffect(() => {
    orders
      .filter((order) => order.status === "PAID")
      .forEach((order) => {
        const access = getGuestOrderAccess(order.orderId);
        void getEventOrderTickets(order.orderId, access?.guestCheckoutToken)
          .then((result) =>
            setTickets((current) => ({ ...current, [order.orderId]: result.tickets }))
          )
          .catch(() => undefined);
      });
  }, [orders]);

  return (
    <EventShell>
      <Seo title="My Event Tickets | TwoPaws" description="View your TwoPaws event orders and QR tickets." canonicalUrl="/account/event-orders" noIndex />
      <div className="py-10">
        <h1 className="text-5xl">My event tickets</h1>
        <p className="mt-3 text-slate-600">Paid tickets appear here only after verified Paymob confirmation.</p>
        {!orders.length ? (
          <div className="mt-10 rounded-2xl border border-slate-200 p-10 text-center">
            <Ticket className="mx-auto h-14 w-14 text-brand-olive" />
            <h2 className="mt-4 text-2xl">No event tickets yet</h2>
            <p className="mt-2 text-slate-500">Purchase a ticket from an event page to see it here.</p>
          </div>
        ) : (
          <div className="mt-9 space-y-6">
            {orders.map((order) => (
              <section key={order.orderId} className={`rounded-2xl border bg-white p-6 ${selectedOrderId === order.orderId ? "border-brand-dark shadow-md" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order {order.orderId.slice(-8).toUpperCase()}</p><h2 className="mt-1 text-2xl">{order.totalQuantity} {order.totalQuantity === 1 ? "ticket" : "tickets"}</h2><p className="mt-1 text-sm text-slate-500">{eventDate(typeof order.createdAt === "string" ? order.createdAt : null)}</p></div>
                  <div className="text-right"><span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-dark">{order.status.replaceAll("_", " ")}</span><p className="mt-2 font-bold">{money(order.totalMinor, order.currency)}</p></div>
                </div>
                {!!tickets[order.orderId]?.length && (
                  <div className="mt-6 divide-y divide-slate-200 border-t border-slate-200">
                    {tickets[order.orderId].map((ticket) => (
                      <Link key={ticket.id} to={`/account/event-tickets/${ticket.id}?orderId=${order.orderId}`} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3"><Ticket className="h-5 w-5 text-brand-dark" /><div><p className="font-bold">{ticket.ticketTypeName}</p><p className="text-xs text-slate-500">{ticket.ticketCode} · {ticket.status.replaceAll("_", " ")}</p></div></div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
        <Button asChild variant="outline" className="mt-8"><Link to="/">Return home</Link></Button>
      </div>
    </EventShell>
  );
}
