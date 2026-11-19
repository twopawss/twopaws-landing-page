import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  Search,
  Settings2,
  ShoppingCart,
  Ticket,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import logo from "../../../../attached_assets/logotrans-brand-800.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/lib/firebase";
import {
  getOrganizerDashboard,
  getOrganizerEvents,
  organizerAction,
} from "@/features/events/api";
import { errorMessage, eventDate, money } from "@/features/events/format";
import type { OrganizerDashboard, PublicEvent } from "@/features/events/types";
import Seo from "@/lib/seo/Seo";

const nav = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "tickets", label: "Tickets", icon: Ticket },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "attendees", label: "Attendees", icon: Users },
  { key: "competition", label: "Competition", icon: Trophy },
  { key: "leaderboard", label: "Leaderboard", icon: ClipboardCheck },
];

const statusClass = (status: string) => {
  if (["PAID", "VALID", "CHECKED_IN", "APPROVED", "PUBLISHED"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["FAILED", "PAYMENT_FAILED", "REJECTED", "CANCELLED", "DISQUALIFIED"].includes(status)) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
};

export default function OrganizerPage() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { eventId: routeEventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.split("/").pop() || "overview";
  const normalizedSection = nav.some((item) => item.key === section) ? section : "overview";
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [eventId, setEventId] = useState(routeEventId || "");
  const [data, setData] = useState<OrganizerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editTicket, setEditTicket] = useState<OrganizerDashboard["ticketTypes"][number] | null>(null);
  const [editEvent, setEditEvent] = useState(false);
  const [editCompetition, setEditCompetition] = useState(false);
  const [moderationEntry, setModerationEntry] = useState<OrganizerDashboard["entries"][number] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async (target = eventId) => {
    if (!target) return;
    setLoading(true);
    try {
      setData(await getOrganizerDashboard(target));
      setError("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    getOrganizerEvents()
      .then((result) => {
        setEvents(result.events);
        const selected = routeEventId || result.events[0]?.id || "";
        setEventId(selected);
        if (selected && !routeEventId) navigate(`/organizer/events/${selected}`, { replace: true });
      })
      .catch((reason) => setError(errorMessage(reason)));
  }, [navigate, routeEventId, user]);

  useEffect(() => {
    if (eventId) void refresh(eventId);
  }, [eventId]);

  const goSection = (key: string) =>
    navigate(key === "overview" ? `/organizer/events/${eventId}` : `/organizer/events/${eventId}/${key}`);

  const filteredOrders = useMemo(() => {
    const needle = search.toLowerCase();
    return (data?.orders || []).filter((order) =>
      [order.id, order.customerName, order.customerEmail, order.status]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [data?.orders, search]);

  const run = async (name: string, payload: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await organizerAction(name, { eventId, ...payload });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <img src={logo} alt="TwoPaws" className="h-24 w-auto" />
        <h1 className="text-4xl">Organizer sign-in required</h1>
        <p className="text-slate-600">Use the same Firebase account assigned to your event.</p>
        <Button asChild className="bg-brand-dark text-white"><Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link></Button>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-dark p-4 text-white">
      <img src={logo} alt="TwoPaws" className="mx-2 h-16 w-auto object-contain" />
      <nav className="mt-8 space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = normalizedSection === item.key;
          return (
            <button key={item.key} onClick={() => goSection(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-white/15" : "hover:bg-white/10"}`}>
              <Icon className="h-5 w-5" />{item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/20 pt-5">
        <p className="truncate px-3 text-sm font-bold">{user.email}</p>
        <p className="px-3 text-xs text-white/60">{data?.role || "Staff"}</p>
        <button onClick={() => void signOutUser()} className="mt-4 flex items-center gap-3 px-3 text-sm"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Seo title="Organizer | TwoPaws Events" description="Secured TwoPaws event administration." canonicalUrl="/organizer" noIndex />
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">{sidebar}</aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="w-64 p-0">{sidebar}</SheetContent></Sheet>
            <select value={eventId} onChange={(e) => { setEventId(e.target.value); navigate(`/organizer/events/${e.target.value}`); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
            {data && <span className={`hidden rounded-md px-2.5 py-1 text-xs font-bold sm:inline ${statusClass(data.event.status)}`}>{data.event.status}</span>}
          </div>
          {data && <Button asChild variant="outline" className="border-brand-dark text-brand-dark"><Link to={`/events/${data.event.id}`} target="_blank">Preview public page <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}
        </header>

        <main className="p-4 sm:p-6">
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading || !data ? (
            <div className="flex min-h-[55vh] items-center justify-center text-brand-dark"><PawPrint className="mr-3 h-8 w-8 animate-bounce" />Loading event operations…</div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h1 className="text-3xl">{nav.find((item) => item.key === normalizedSection)?.label}</h1><p className="text-sm text-slate-500">{data.event.title}</p></div>
                {data.role === "organizer" && (
                  <div className="flex gap-2">
                    {["PUBLISHED", "CANCELLED", "COMPLETED"].map((status) => (
                      <Button key={status} disabled={busy || data.event.status === status} variant="outline" size="sm" onClick={() => void run("updateOrganizerEventStatus", { status })}>{status.replace("_", " ")}</Button>
                    ))}
                  </div>
                )}
              </div>

              {normalizedSection === "overview" && (
                <div className="space-y-5">
                  {data.role === "organizer" && (
                    <div className="flex justify-end">
                      <Button onClick={() => setEditEvent(true)} className="bg-brand-dark text-white">
                        <Settings2 className="mr-2 h-4 w-4" />Edit event details
                      </Button>
                    </div>
                  )}
                  <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-4">
                    {[["Capacity", data.event.capacity], ["Sold", data.event.soldCount], ["Reserved", data.event.reservedCount], ["Remaining", Math.max(0, data.event.capacity - data.event.soldCount - data.event.reservedCount)]].map(([label, value]) => (
                      <div key={String(label)} className="border-b border-slate-200 p-5 text-center last:border-0 sm:border-b-0 sm:border-r"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-brand-dark">{value}</p></div>
                    ))}
                  </section>
                  <section className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-6"><CalendarDays className="h-6 w-6 text-brand-dark" /><h2 className="mt-4 text-xl">Event schedule</h2><p className="mt-2">{eventDate(data.event.startsAt)} – {eventDate(data.event.endsAt)}</p><p className="mt-1 text-sm text-slate-500">{data.event.venueName}<br />{data.event.venueAddress}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-white p-6"><Settings2 className="h-6 w-6 text-brand-dark" /><h2 className="mt-4 text-xl">Operational status</h2><p className="mt-2 text-sm text-slate-600">Website and app ticket prices are stored separately. Payment status remains webhook-controlled.</p></div>
                  </section>
                </div>
              )}

              {normalizedSection === "tickets" && (
                <div className="rounded-xl border border-slate-200 bg-white">
                  {data.role === "organizer" && (
                    <div className="flex justify-end border-b border-slate-200 p-4">
                      <Button className="bg-brand-dark text-white" onClick={() => setEditTicket({
                        id: "",
                        name: "",
                        description: "",
                        benefits: [],
                        appPriceMinor: 1000,
                        webPriceMinor: 1000,
                        currency: "EGP",
                        capacity: 1,
                        reservedCount: 0,
                        soldCount: 0,
                        minPerOrder: 1,
                        maxPerOrder: 10,
                        salesStartAt: data.event.salesStartAt,
                        salesEndAt: data.event.salesEndAt,
                        active: true,
                        sortOrder: data.ticketTypes.length,
                      })}>Add ticket type</Button>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Ticket type", "Website price", "App price", "Capacity", "Reserved", "Sold", "Remaining", "Active", "Action"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>
                    {data.ticketTypes.map((type) => <tr key={type.id} className="border-t border-slate-200"><td className="px-4 py-4"><strong>{type.name}</strong><p className="text-xs text-slate-500">{type.description}</p></td><td className="px-4">{money(type.webPriceMinor, type.currency)}</td><td className="px-4">{money(type.appPriceMinor, type.currency)}</td><td className="px-4">{type.capacity}</td><td className="px-4">{type.reservedCount}</td><td className="px-4">{type.soldCount}</td><td className="px-4 font-bold text-brand-dark">{Math.max(0, type.capacity - type.reservedCount - type.soldCount)}</td><td className="px-4">{type.active ? "Yes" : "No"}</td><td className="px-4"><Button variant="outline" size="sm" onClick={() => setEditTicket(type)} disabled={data.role !== "organizer"}>Edit</Button></td></tr>)}
                  </tbody></table>
                  </div>
                </div>
              )}

              {normalizedSection === "orders" && (
                <section className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3 border-b border-slate-200 p-4"><Search className="h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer or status" className="max-w-md border-0 shadow-none focus-visible:ring-0" /></div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Order", "Customer", "Channel", "Tickets", "Total", "Status", "Created"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id} className="border-t border-slate-200"><td className="px-4 py-4 font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</td><td className="px-4"><strong>{order.customerName}</strong><p className="text-xs text-slate-500">{order.customerEmail}</p></td><td className="px-4">{order.salesChannel}</td><td className="px-4">{order.totalQuantity}</td><td className="px-4 font-semibold">{money(order.totalMinor, order.currency)}</td><td className="px-4"><span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(order.status)}`}>{order.status}</span></td><td className="px-4">{eventDate(order.createdAt)}</td></tr>)}</tbody></table></div>
                </section>
              )}

              {normalizedSection === "attendees" && (
                <section className="rounded-xl border border-slate-200 bg-white">
                  <div className="grid border-b border-slate-200 sm:grid-cols-3">{[["Checked in", data.tickets.filter((ticket) => ticket.status === "CHECKED_IN").length], ["Not checked in", data.tickets.filter((ticket) => ticket.status === "VALID").length], ["Issued tickets", data.tickets.length]].map(([label, value]) => <div key={String(label)} className="p-5 text-center"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-brand-dark">{value}</p></div>)}</div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Ticket", "Type", "Status", "Issued", "Checked in"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{data.tickets.map((ticket) => <tr key={ticket.id} className="border-t border-slate-200"><td className="px-4 py-4 font-mono">{ticket.ticketCode}</td><td className="px-4">{ticket.ticketTypeName}</td><td className="px-4"><span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>{ticket.status}</span></td><td className="px-4">{eventDate(ticket.issuedAt)}</td><td className="px-4">{ticket.checkedInAt ? eventDate(ticket.checkedInAt) : "—"}</td></tr>)}</tbody></table></div>
                </section>
              )}

              {normalizedSection === "competition" && data.competition && (
                <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                  <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Pet", "Breed", "Status", "Votes", "Submitted", "Action"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{data.entries.map((entry) => <tr key={entry.id} className="border-t border-slate-200"><td className="px-4 py-3"><div className="flex items-center gap-3"><img src={entry.petImageUrl} alt="" className="h-10 w-10 rounded-full object-cover" /><strong>{entry.petName}</strong></div></td><td className="px-4">{entry.petBreed}</td><td className="px-4"><span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(entry.status)}`}>{entry.status}</span></td><td className="px-4">{entry.voteCount}</td><td className="px-4">{eventDate(entry.submittedAt)}</td><td className="px-4"><Button size="sm" variant="outline" disabled={!["organizer", "approver"].includes(data.role)} onClick={() => { setModerationEntry(entry); setNote(entry.moderationNote); }}>Moderate</Button></td></tr>)}</tbody></table></section>
                  <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl">Competition controls</h2><p className="mt-2 text-sm text-slate-500">{data.competition.status}</p>{data.role === "organizer" && <><Button variant="outline" className="mt-4 w-full" onClick={() => setEditCompetition(true)}>Edit rules and dates</Button><div className="mt-3 space-y-2">{["ENTRIES_OPEN", "ENTRIES_CLOSED", "VOTING_OPEN", "VOTING_CLOSED"].map((status) => <Button key={status} disabled={busy || data.competition?.status === status} variant="outline" className="w-full justify-start" onClick={() => void run("updateOrganizerCompetitionStatus", { competitionId: data.competition?.id, status })}>{status.replaceAll("_", " ")}</Button>)}</div></>}<Button asChild variant="outline" className="mt-5 w-full border-brand-dark text-brand-dark"><Link to={`/events/${eventId}/leaderboard`} target="_blank">Preview leaderboard <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>{data.role === "organizer" && <Button disabled={busy} className="mt-3 w-full bg-brand-dark text-white" onClick={() => void run("publishCompetitionResults", { competitionId: data.competition?.id })}>Publish results</Button>}</aside>
                </div>
              )}

              {normalizedSection === "leaderboard" && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><iframe title="Public leaderboard preview" src={`/events/${eventId}/leaderboard`} className="h-[720px] w-full" /></div>
              )}
            </>
          )}
        </main>
      </div>

      <Dialog open={Boolean(editTicket)} onOpenChange={(open) => !open && setEditTicket(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit ticket type</DialogTitle></DialogHeader>{editTicket && <TicketEditor ticket={editTicket} busy={busy} onSave={(ticket) => void run("upsertOrganizerTicketType", { ticketTypeId: editTicket.id, ticketType: ticket }).then(() => setEditTicket(null))} />}</DialogContent>
      </Dialog>

      <Dialog open={editEvent} onOpenChange={setEditEvent}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit event details</DialogTitle></DialogHeader>
          {data && (
            <EventEditor
              event={data.event}
              eventId={eventId}
              busy={busy}
              onSave={(event) =>
                void run("updateOrganizerEvent", { event }).then(() => setEditEvent(false))
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editCompetition} onOpenChange={setEditCompetition}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit competition</DialogTitle></DialogHeader>
          {data?.competition && (
            <CompetitionEditor
              competition={data.competition}
              busy={busy}
              onSave={(competition) =>
                void run("updateOrganizerCompetition", {
                  competitionId: data.competition?.id,
                  competition,
                }).then(() => setEditCompetition(false))
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(moderationEntry)} onOpenChange={(open) => !open && setModerationEntry(null)}>
        <DialogContent><DialogHeader><DialogTitle>Moderate {moderationEntry?.petName}</DialogTitle></DialogHeader><Label htmlFor="moderation-note">Private moderation note</Label><Textarea id="moderation-note" value={note} onChange={(e) => setNote(e.target.value)} /><div className="flex flex-wrap gap-2"><Button disabled={busy} className="bg-emerald-600 text-white" onClick={() => void run("approveCompetitionEntry", { entryId: moderationEntry?.id, moderationNote: note }).then(() => setModerationEntry(null))}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button><Button disabled={busy} variant="destructive" onClick={() => void run("rejectCompetitionEntry", { entryId: moderationEntry?.id, reason: "Organizer decision", moderationNote: note }).then(() => setModerationEntry(null))}><XCircle className="mr-2 h-4 w-4" />Reject</Button><Button disabled={busy} variant="outline" onClick={() => void run("disqualifyCompetitionEntry", { entryId: moderationEntry?.id, moderationNote: note }).then(() => setModerationEntry(null))}>Disqualify</Button></div></DialogContent>
      </Dialog>
    </div>
  );
}

function EventEditor({
  event,
  eventId,
  busy,
  onSave,
}: {
  event: PublicEvent;
  eventId: string;
  busy: boolean;
  onSave: (event: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState({ ...event });
  const [uploading, setUploading] = useState(false);
  const uploadHero = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return;
    setUploading(true);
    try {
      const imageRef = ref(storage, `eventImages/${eventId}/hero-${Date.now()}-${file.name}`);
      await uploadBytes(imageRef, file, { contentType: file.type });
      setValue((current) => ({ ...current, heroImageUrl: "" }));
      const heroImageUrl = await getDownloadURL(imageRef);
      setValue((current) => ({ ...current, heroImageUrl }));
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Event name</Label><Input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={5} value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} /></div>
      <div><Label>Venue</Label><Input value={value.venueName} onChange={(e) => setValue({ ...value, venueName: e.target.value })} /></div>
      <div><Label>Venue address</Label><Input value={value.venueAddress} onChange={(e) => setValue({ ...value, venueAddress: e.target.value })} /></div>
      <div><Label>Organizer name</Label><Input value={value.organizerName} onChange={(e) => setValue({ ...value, organizerName: e.target.value })} /></div>
      <div><Label>Organizer logo URL</Label><Input value={value.organizerLogoUrl} onChange={(e) => setValue({ ...value, organizerLogoUrl: e.target.value })} /></div>
      <div className="sm:col-span-2">
        <Label>Event hero image</Label>
        {value.heroImageUrl && <img src={value.heroImageUrl} alt="" className="mt-2 h-40 w-full rounded-xl object-cover" />}
        <Input className="mt-2" type="file" accept="image/*" disabled={uploading || busy} onChange={(e) => void uploadHero(e.target.files?.[0])} />
        <p className="mt-1 text-xs text-slate-500">{uploading ? "Uploading image…" : "JPG, PNG or WebP, up to 8 MB."}</p>
      </div>
      <Button disabled={busy || uploading || !value.heroImageUrl} className="sm:col-span-2 bg-brand-dark text-white" onClick={() => onSave(value)}>Save event details</Button>
    </div>
  );
}

function CompetitionEditor({
  competition,
  busy,
  onSave,
}: {
  competition: NonNullable<OrganizerDashboard["competition"]>;
  busy: boolean;
  onSave: (competition: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState({
    ...competition,
    rulesText: competition.rules.join("\n"),
  });
  return (
    <div className="grid gap-4">
      <div><Label>Competition name</Label><Input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} /></div>
      <div><Label>Description</Label><Textarea value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} /></div>
      <div><Label>Prize</Label><Input value={value.prize} onChange={(e) => setValue({ ...value, prize: e.target.value })} /></div>
      <div><Label>Rules, one per line</Label><Textarea rows={5} value={value.rulesText} onChange={(e) => setValue({ ...value, rulesText: e.target.value })} /></div>
      <div><Label>Maximum votes per user</Label><Input type="number" min={1} max={20} value={value.maxVotesPerUser} onChange={(e) => setValue({ ...value, maxVotesPerUser: Number(e.target.value) })} /></div>
      <Button disabled={busy} className="bg-brand-dark text-white" onClick={() => onSave({ ...value, rules: value.rulesText.split("\n").map((item) => item.trim()).filter(Boolean) })}>Save competition</Button>
    </div>
  );
}

function TicketEditor({
  ticket,
  busy,
  onSave,
}: {
  ticket: OrganizerDashboard["ticketTypes"][number];
  busy: boolean;
  onSave: (ticket: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState({
    ...ticket,
    benefitsText: ticket.benefits.join("\n"),
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Name</Label><Input value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} /></div>
      <div><Label>Website price (minor units)</Label><Input type="number" value={value.webPriceMinor} onChange={(e) => setValue({ ...value, webPriceMinor: Number(e.target.value) })} /></div>
      <div><Label>App price (minor units)</Label><Input type="number" value={value.appPriceMinor} onChange={(e) => setValue({ ...value, appPriceMinor: Number(e.target.value) })} /></div>
      <div><Label>Capacity</Label><Input type="number" value={value.capacity} onChange={(e) => setValue({ ...value, capacity: Number(e.target.value) })} /></div>
      <div><Label>Maximum per order</Label><Input type="number" value={value.maxPerOrder} onChange={(e) => setValue({ ...value, maxPerOrder: Number(e.target.value) })} /></div>
      <div><Label>Sales start</Label><Input type="datetime-local" value={value.salesStartAt?.slice(0, 16) || ""} onChange={(e) => setValue({ ...value, salesStartAt: e.target.value })} /></div>
      <div><Label>Sales end</Label><Input type="datetime-local" value={value.salesEndAt?.slice(0, 16) || ""} onChange={(e) => setValue({ ...value, salesEndAt: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label>Benefits, one per line</Label><Textarea value={value.benefitsText} onChange={(e) => setValue({ ...value, benefitsText: e.target.value })} /></div>
      <Button disabled={busy} className="sm:col-span-2 bg-brand-dark text-white" onClick={() => onSave({ ...value, benefits: value.benefitsText.split("\n").map((item) => item.trim()).filter(Boolean) })}>Save ticket type</Button>
    </div>
  );
}
