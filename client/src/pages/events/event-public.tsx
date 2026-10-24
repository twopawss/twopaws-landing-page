import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  Minus,
  PawPrint,
  Plus,
  ShieldCheck,
  Ticket,
  Trophy,
} from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { ANDROID_STORE_URL, IOS_STORE_URL } from "@/lib/seo/constants";
import Seo from "@/lib/seo/Seo";
import {
  createEventOrder,
  createEventPayment,
  getPublicEvent,
} from "@/features/events/api";
import {
  createGuestToken,
  saveGuestOrderAccess,
} from "@/features/events/guestAccess";
import { errorMessage, eventDate, eventTime, money } from "@/features/events/format";
import type { PublicEventResponse } from "@/features/events/types";

const terminalSalesState = (data: PublicEventResponse) => {
  const event = data.event;
  if (event.status === "CANCELLED") return "cancelled";
  if (!event.ticketingEnabled || event.status !== "PUBLISHED") return "closed";
  const now = Date.now();
  if (event.salesStartAt && new Date(event.salesStartAt).getTime() > now) return "not-started";
  if (event.salesEndAt && new Date(event.salesEndAt).getTime() <= now) return "closed";
  if (data.ticketTypes.every((type) => type.remaining <= 0)) return "sold-out";
  return "open";
};

export default function PublicEventPage() {
  const { eventSlug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const checkoutMode = location.pathname.endsWith("/checkout");
  const [data, setData] = useState<PublicEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPublicEvent(eventSlug)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventSlug]);

  const selection = useMemo(() => {
    if (!data) return [];
    return data.ticketTypes
      .map((type) => ({ type, quantity: quantities[type.id] || 0 }))
      .filter((line) => line.quantity > 0);
  }, [data, quantities]);
  const subtotal = selection.reduce(
    (sum, line) => sum + line.type.priceMinor * line.quantity,
    0
  );
  const totalQuantity = selection.reduce((sum, line) => sum + line.quantity, 0);
  const salesState = data ? terminalSalesState(data) : "closed";

  const setQuantity = (id: string, quantity: number) => {
    if (!data) return;
    const type = data.ticketTypes.find((item) => item.id === id);
    if (!type) return;
    const next = Math.max(
      0,
      Math.min(quantity, type.remaining, type.maxPerOrder, 10 - totalQuantity + (quantities[id] || 0))
    );
    setQuantities((current) => ({ ...current, [id]: next }));
  };

  const continueCheckout = () => {
    if (!selection.length) {
      setError("Choose at least one ticket.");
      return;
    }
    sessionStorage.setItem(
      `twopaws:event-selection:${eventSlug}`,
      JSON.stringify(quantities)
    );
    navigate(`/events/${eventSlug}/checkout`);
  };

  useEffect(() => {
    if (!checkoutMode) return;
    const raw = sessionStorage.getItem(`twopaws:event-selection:${eventSlug}`);
    if (!raw) return;
    try {
      setQuantities(JSON.parse(raw) as Record<string, number>);
    } catch {
      // Invalid local selection is safely ignored.
    }
  }, [checkoutMode, eventSlug]);

  const pay = async () => {
    if (!data || !selection.length) return;
    setBusy(true);
    setError("");
    try {
      const guestToken = user ? undefined : createGuestToken();
      const order = await createEventOrder({
        eventId: data.event.id,
        requestId: crypto.randomUUID(),
        items: selection.map((line) => ({
          ticketTypeId: line.type.id,
          quantity: line.quantity,
        })),
        guestCheckoutToken: guestToken,
        guest: user ? undefined : guest,
      });
      if (guestToken) {
        saveGuestOrderAccess({
          orderId: order.orderId,
          eventSlug,
          guestCheckoutToken: guestToken,
          createdAt: new Date().toISOString(),
        });
      } else {
        sessionStorage.setItem("twopaws:pending-event-order", order.orderId);
        sessionStorage.setItem(`twopaws:event-order-slug:${order.orderId}`, eventSlug);
      }
      sessionStorage.setItem("twopaws:pending-event-slug", eventSlug);
      const payment = await createEventPayment(order.orderId, guestToken);
      if (!payment.checkoutUrl) throw new Error("Paymob checkout is unavailable.");
      window.location.assign(payment.checkoutUrl);
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <EventShell>
        <div className="grid min-h-[640px] gap-8 py-10 lg:grid-cols-2">
          <Skeleton className="min-h-[480px] rounded-[24px]" />
          <div className="space-y-5 py-8">
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-14 w-48" />
          </div>
        </div>
      </EventShell>
    );
  }

  if (!data) {
    return (
      <EventShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
          <PawPrint className="h-16 w-16 text-brand-olive" />
          <h1 className="text-4xl">We couldn’t find this event</h1>
          <p className="max-w-lg text-slate-600">{error || "The event may have moved or is no longer available."}</p>
          <Button asChild className="bg-brand-dark text-white">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </EventShell>
    );
  }

  const { event, competition } = data;
  const deepLink = competition
    ? `twopaws://twopaws.com/pet-event-submission?competitionRef=${encodeURIComponent(
        competition.id
      )}`
    : "";

  if (checkoutMode) {
    return (
      <EventShell>
        <Seo title={`Checkout | ${event.title}`} description="Reserve event tickets and pay securely with Paymob." canonicalUrl={`/events/${eventSlug}/checkout`} noIndex />
        <div className="mx-auto grid max-w-5xl gap-10 py-10 lg:grid-cols-[1fr_380px]">
          <section>
            <Link to={`/events/${eventSlug}`} className="text-sm font-semibold text-brand-dark">
              ← Back to event
            </Link>
            <h1 className="mt-5 text-4xl sm:text-5xl">Complete your booking</h1>
            <p className="mt-3 text-slate-600">
              Your tickets are reserved for 15 minutes while you complete Paymob payment.
            </p>
            {!user && (
              <div className="mt-8 space-y-5 border-t border-slate-200 pt-8">
                <h2 className="text-2xl">Guest details</h2>
                <p className="text-sm text-slate-600">
                  No account is required. Keep this browser open so we can show your tickets after payment.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="guest-name">Full name</Label>
                    <Input
                      id="guest-name"
                      className="mt-2"
                      value={guest.name}
                      onChange={(e) => setGuest((value) => ({ ...value, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guest-email">Email</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      className="mt-2"
                      value={guest.email}
                      onChange={(e) => setGuest((value) => ({ ...value, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guest-phone">Phone</Label>
                    <Input
                      id="guest-phone"
                      className="mt-2"
                      value={guest.phone}
                      onChange={(e) => setGuest((value) => ({ ...value, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-brand-cream p-4 text-sm text-brand-dark">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              Tickets are issued only after TwoPaws receives a verified Paymob confirmation.
            </div>
          </section>
          <aside className="h-fit rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-2xl">Your order</h2>
            <div className="mt-5 space-y-4">
              {selection.map((line) => (
                <div key={line.type.id} className="flex justify-between gap-4 text-sm">
                  <span>{line.type.name} × {line.quantity}</span>
                  <strong>{money(line.type.priceMinor * line.quantity, event.currency)}</strong>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, event.currency)}</span></div>
              <div className="flex justify-between"><span>Fees</span><span>{money(data.feeMinor, event.currency)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-brand-dark">{money(subtotal + data.feeMinor, event.currency)}</span></div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <Button
              className="mt-6 h-14 w-full bg-brand-olive text-base font-bold text-brand-dark hover:bg-brand-olive/90"
              disabled={busy || (!user && (!guest.name || !guest.email))}
              onClick={() => void pay()}
            >
              {busy ? "Opening Paymob…" : "Continue to Paymob"}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">Paymob is the only payment method for event tickets.</p>
          </aside>
        </div>
      </EventShell>
    );
  }

  return (
    <EventShell>
      <Seo title={`${event.title} | TwoPaws Events`} description={event.description} canonicalUrl={`/events/${eventSlug}/`} />
      <section className="grid overflow-hidden border-b border-slate-200 lg:grid-cols-2">
        <img src={event.heroImageUrl} alt={event.title} className="h-full min-h-[420px] w-full object-cover lg:min-h-[570px]" />
        <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-14">
          <h1 className="max-w-xl text-5xl leading-[0.98] sm:text-6xl">{event.title}</h1>
          <div className="mt-8 space-y-4 text-slate-700">
            <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-brand-dark" />{eventDate(event.startsAt)}</div>
            <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-brand-dark" />{eventTime(event.startsAt)} – {eventTime(event.endsAt)}</div>
            <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-brand-dark" />{event.venueName}, {event.venueAddress}</div>
          </div>
          <p className="mt-8 max-w-xl text-lg text-slate-600">{event.description}</p>
          <Button
            className="mt-8 h-14 w-fit bg-brand-olive px-8 text-base font-bold text-brand-dark hover:bg-brand-olive/90"
            onClick={() => document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" })}
          >
            Choose tickets <PawPrint className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section id="tickets" className="grid gap-8 py-14 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-4xl">Choose your tickets</h2>
          <p className="mt-2 text-slate-600">Mix ticket types in one order. Prices shown are website prices.</p>
          {salesState !== "open" && (
            <div className="mt-6 rounded-xl border border-brand-olive bg-brand-cream p-5 font-semibold text-brand-dark">
              {salesState === "sold-out" && "This event is sold out."}
              {salesState === "closed" && "Ticket sales are closed."}
              {salesState === "not-started" && "Ticket sales have not opened yet."}
              {salesState === "cancelled" && "This event has been cancelled."}
            </div>
          )}
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            {data.ticketTypes.map((type) => {
              const quantity = quantities[type.id] || 0;
              return (
                <article key={type.id} className="grid gap-5 border-b border-slate-200 p-5 last:border-0 md:grid-cols-[1.25fr_1fr_auto] md:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-brand-cream p-2 text-brand-dark"><Ticket className="h-5 w-5" /></span>
                      <div><h3 className="text-xl">{type.name}</h3><p className="text-sm text-slate-500">{type.description}</p></div>
                    </div>
                    {!!type.benefits.length && (
                      <ul className="mt-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        {type.benefits.map((benefit) => <li key={benefit} className="flex gap-2"><Check className="h-4 w-4 text-brand-dark" />{benefit}</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-brand-dark">{money(type.priceMinor, type.currency)}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{type.remaining} remaining</p>
                    <p className="mt-1 text-xs text-slate-500">Sales end {eventDate(type.salesEndAt)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 p-1">
                    <button aria-label={`Remove ${type.name}`} disabled={!quantity} onClick={() => setQuantity(type.id, quantity - 1)} className="p-2 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-5 text-center font-bold">{quantity}</span>
                    <button aria-label={`Add ${type.name}`} disabled={salesState !== "open" || type.remaining <= quantity || totalQuantity >= 10} onClick={() => setQuantity(type.id, quantity + 1)} className="p-2 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 p-6 shadow-sm lg:sticky lg:top-24">
          <h3 className="text-2xl">Your order</h3>
          {!selection.length && <p className="mt-4 text-sm text-slate-500">Choose tickets to begin.</p>}
          <div className="mt-5 space-y-3">
            {selection.map((line) => <div key={line.type.id} className="flex justify-between text-sm"><span>{line.type.name} × {line.quantity}</span><span>{money(line.type.priceMinor * line.quantity, event.currency)}</span></div>)}
          </div>
          <div className="mt-5 flex justify-between border-t border-slate-200 pt-5 text-lg font-bold"><span>Total</span><span>{money(subtotal, event.currency)}</span></div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <Button disabled={!selection.length || salesState !== "open"} onClick={continueCheckout} className="mt-5 h-14 w-full bg-brand-olive font-bold text-brand-dark hover:bg-brand-olive/90">Continue to Paymob</Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />Secure Paymob checkout</p>
        </aside>
      </section>

      {competition && (
        <section className="border-y border-slate-200 py-14">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl">{competition.title}</h2>
              <p className="mt-4 max-w-2xl text-slate-600">{competition.description}</p>
              <dl className="mt-8 grid gap-5 sm:grid-cols-2">
                <div><dt className="font-bold text-brand-dark">Prize</dt><dd className="mt-1 text-slate-600">{competition.prize || "Winner trophy and TwoPaws prize pack"}</dd></div>
                <div><dt className="font-bold text-brand-dark">Entry deadline</dt><dd className="mt-1 text-slate-600">{eventDate(competition.entriesCloseAt)}</dd></div>
                <div><dt className="font-bold text-brand-dark">Approved entries</dt><dd className="mt-1 text-slate-600">{competition.approvedEntryCount}</dd></div>
                {event.ticketingEnabled && <div><dt className="font-bold text-brand-dark">Admission</dt><dd className="mt-1 text-slate-600">Competition entry does not include event admission.</dd></div>}
              </dl>
              {!!competition.rules.length && <ul className="mt-8 space-y-2 text-sm text-slate-600">{competition.rules.map((rule) => <li key={rule} className="flex gap-2"><PawPrint className="h-4 w-4 text-brand-olive" />{rule}</li>)}</ul>}
              <Button asChild variant="outline" className="mt-8 border-brand-dark text-brand-dark"><Link to={`/events/${eventSlug}/leaderboard`}><Trophy className="mr-2 h-4 w-4" />View live leaderboard</Link></Button>
            </div>
            <div className="rounded-2xl border border-brand-olive bg-brand-cream p-7 sm:p-9">
              <h3 className="text-3xl">Enter Your Pet</h3>
              <p className="mt-3 text-slate-700">Sign in, add your pet's name and photo, and you're in. Entries are reviewed by the organiser before they appear on the leaderboard.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="bg-brand-dark text-white"><Link to={`/events/${eventSlug}/enter`}><PawPrint className="mr-2 h-4 w-4" />Enter on the website</Link></Button>
                <Button asChild variant="outline"><a href={deepLink}>Open in the app</a></Button>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Don't have the app yet? <a href={IOS_STORE_URL} target="_blank" rel="noreferrer" className="underline">App Store</a> · <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer" className="underline">Google Play <ExternalLink className="inline h-3 w-3" /></a>
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl">About the venue</h2>
          <p className="mt-5 flex gap-3 text-lg"><MapPin className="mt-1 h-5 w-5 text-brand-dark" />{event.venueName}<br />{event.venueAddress}</p>
          {event.latitude != null && event.longitude != null && (
            <a className="mt-5 inline-flex items-center text-sm font-semibold text-brand-dark" href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} target="_blank" rel="noreferrer">View on Google Maps <ExternalLink className="ml-2 h-4 w-4" /></a>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 p-7">
          <p className="text-sm text-slate-500">Organized by</p>
          <h3 className="mt-2 text-3xl">{event.organizerName}</h3>
          {data.winner ? (
            <div className="mt-7 flex items-center gap-5 border-t border-slate-200 pt-6">
              <img src={data.winner.petImageUrl} alt={data.winner.petName} className="h-20 w-20 rounded-full object-cover" />
              <div><p className="text-sm font-semibold text-brand-olive">Published winner</p><p className="text-2xl font-bold">{data.winner.petName}</p><p className="text-slate-500">{data.winner.petBreed}</p></div>
            </div>
          ) : <p className="mt-6 text-slate-600">The winner will appear here after final results are published.</p>}
        </div>
      </section>
    </EventShell>
  );
}
