import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
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
