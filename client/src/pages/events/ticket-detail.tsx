import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { getEventOrderTickets } from "@/features/events/api";
import { getGuestOrderAccess } from "@/features/events/guestAccess";
import { errorMessage } from "@/features/events/format";
import Seo from "@/lib/seo/Seo";

type TicketData = Awaited<ReturnType<typeof getEventOrderTickets>>["tickets"][number];

export default function EventTicketDetailPage() {
  const { ticketId = "" } = useParams();
  const [params] = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    const access = getGuestOrderAccess(orderId);
    getEventOrderTickets(orderId, access?.guestCheckoutToken)
      .then((result) => setTicket(result.tickets.find((item) => item.id === ticketId) || null))
      .catch((reason) => setError(errorMessage(reason)));
  }, [orderId, ticketId]);

  return (
    <EventShell>
      <Seo title="Event Ticket QR | TwoPaws" description="Your secure TwoPaws event QR ticket." canonicalUrl={`/account/event-tickets/${ticketId}`} noIndex />
      <div className="mx-auto max-w-lg py-10 text-center">
        <Link to={`/account/event-orders?orderId=${orderId}`} className="text-sm font-semibold text-brand-dark">← Back to my tickets</Link>
        {ticket ? (
          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg">
            <div className="bg-brand-dark px-6 py-7 text-white"><Ticket className="mx-auto h-9 w-9 text-brand-olive" /><h1 className="mt-3 text-3xl text-white">{ticket.ticketTypeName}</h1><p className="mt-1 text-sm text-white/70">{ticket.ticketCode}</p></div>
            <div className="p-8">
              <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-5"><QRCodeSVG value={ticket.qrPayload} size={230} level="H" includeMargin /></div>
              <p className="mt-6 flex items-center justify-center gap-2 font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />{ticket.status.replaceAll("_", " ")}</p>
              <p className="mt-3 text-sm text-slate-500">Present this QR code to event staff. Each ticket can be checked in only once.</p>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-slate-200 p-8"><p>{error || "Loading your ticket…"}</p></div>
        )}
        <Button asChild variant="outline" className="mt-7"><Link to="/">Return home</Link></Button>
      </div>
    </EventShell>
  );
}
