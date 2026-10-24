import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type {
  EventOrderStatus,
  OrganizerDashboard,
  PublicEventResponse,
  PublicEntry,
  PublicEvent,
  PublicCompetition,
} from "./types";

const call = async <TResult>(
  name: string,
  data: Record<string, unknown>
) => {
  const fn = httpsCallable<Record<string, unknown>, TResult>(functions, name);
  const result = await fn(data);
  return result.data;
};

export const getPublicEvent = (eventSlug: string) =>
  call<PublicEventResponse>("getPublicEvent", { eventSlug });

export const getPublicLeaderboard = (eventSlug: string) =>
  call<{
    event: PublicEvent;
    competition: PublicCompetition;
    entries: PublicEntry[];
    generatedAt: string;
  }>("getPublicEventLeaderboard", { eventSlug });

export const castCompetitionVote = (competitionId: string, entryId: string) =>
  call<{
    entryId: string;
    voteCount: number;
    votesUsed: number;
    maxVotes: number;
  }>("castCompetitionVote", { competitionId, entryId });

// Mirrors `deterministicId("competition-ballot", competitionId, uid)` in
// functions/src/events/shared.ts: sha256 of the colon-joined parts, first 40 hex chars.
const ballotDocId = async (competitionId: string, uid: string) => {
  const bytes = new TextEncoder().encode(
    ["competition-ballot", competitionId, uid].join(":")
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  )
    .join("")
    .slice(0, 40);
};

// The signed-in user's own ballot (rules allow a voter to read it). Returns the
// ids of the entries they have voted for; empty when they have not voted yet.
export const getMyCompetitionBallot = async (
  competitionId: string,
  uid: string
): Promise<string[]> => {
  const snap = await getDoc(
    doc(db, "competitionVotes", await ballotDocId(competitionId, uid))
  );
  if (!snap.exists()) return [];
  const refs = (snap.get("entryRefs") as Array<{ id: string }> | undefined) || [];
  return refs.map((ref) => ref.id);
};

export const createEventOrder = (input: {
  eventId: string;
  requestId: string;
  items: Array<{ ticketTypeId: string; quantity: number }>;
  guestCheckoutToken?: string;
  guest?: { name: string; email: string; phone: string };
}) =>
  call<{
    orderId: string;
    status: string;
    currency: string;
    subtotalMinor: number;
    totalMinor: number;
    totalQuantity: number;
  }>("createEventOrder", { ...input, salesChannel: "WEB" });

export const createEventPayment = (
  orderId: string,
  guestCheckoutToken?: string
) =>
  call<{ checkoutUrl: string; status: string }>("createEventPaymobPayment", {
    orderId,
    guestCheckoutToken,
  });

export const getEventOrderStatus = (
  orderId: string,
  guestCheckoutToken?: string
) =>
  call<EventOrderStatus>("getEventOrderStatus", {
    orderId,
    guestCheckoutToken,
  });

export const getEventOrderTickets = (
  orderId: string,
  guestCheckoutToken?: string
) =>
  call<{
    order: EventOrderStatus;
    tickets: Array<{
      id: string;
      eventId: string;
      ticketTypeName: string;
      ticketCode: string;
      qrPayload: string;
      status: string;
      issuedAt: string | null;
      checkedInAt: string | null;
    }>;
  }>("getEventOrderTickets", { orderId, guestCheckoutToken });

export const getOrganizerEvents = () =>
  call<{ events: PublicEvent[] }>("getOrganizerEvents", {});

export const getOrganizerDashboard = (eventId: string) =>
  call<OrganizerDashboard>("getOrganizerEventDashboard", { eventId });

export const organizerAction = <TResult>(
  name: string,
  data: Record<string, unknown>
) => call<TResult>(name, data);
