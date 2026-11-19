export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroImageUrl: string;
  status: string;
  currency: string;
  capacity: number;
  reservedCount: number;
  soldCount: number;
  ticketingEnabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  organizerName: string;
  organizerLogoUrl: string;
};

export type PublicTicketType = {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  priceMinor: number;
  currency: string;
  capacity: number;
  reservedCount: number;
  soldCount: number;
  remaining: number;
  minPerOrder: number;
  maxPerOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  active: boolean;
  sortOrder: number;
};

export type PublicCompetition = {
  id: string;
  title: string;
  description: string;
  prize: string;
  rules: string[];
  status: string;
  approvedEntryCount: number;
  totalVoteCount: number;
  maxVotesPerUser: number;
  entriesOpenAt: string | null;
  entriesCloseAt: string | null;
  votingStartAt: string | null;
  votingEndAt: string | null;
  resultsPublishedAt: string | null;
  winnerEntryId: string | null;
};

export type PublicEntry = {
  id: string;
  petName: string;
  petBreed: string;
  petSpecies: string;
  petImageUrl: string;
  voteCount: number;
  finalVoteCount: number;
  finalRank: number | null;
  isWinner: boolean;
  approvedAt: string | null;
};

export type PublicEventResponse = {
  event: PublicEvent;
  ticketTypes: PublicTicketType[];
  competition: PublicCompetition | null;
  winner: PublicEntry | null;
  feeMinor: number;
};

export type EventOrderStatus = {
  orderId: string;
  eventId: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  feeMinor: number;
  totalMinor: number;
  totalQuantity: number;
  salesChannel: string;
  reservationExpiresAt: unknown;
  reservationReleasedAt: unknown;
  paidAt: unknown;
  createdAt: unknown;
};

export type OrganizerDashboard = {
  role: "organizer" | "approver" | "checkin" | string;
  event: PublicEvent;
  ticketTypes: Array<
    Omit<PublicTicketType, "priceMinor" | "remaining"> & {
      appPriceMinor: number;
      webPriceMinor: number;
    }
  >;
  orders: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    salesChannel: string;
    totalQuantity: number;
    totalMinor: number;
    currency: string;
    status: string;
    isGuest: boolean;
    createdAt: string | null;
  }>;
  tickets: Array<{
    id: string;
    ticketCode: string;
    ticketTypeName: string;
    status: string;
    ownerUid: string;
    issuedAt: string | null;
    checkedInAt: string | null;
  }>;
  competition: (PublicCompetition & { prize: string; rules: string[] }) | null;
  entries: Array<{
    id: string;
    petName: string;
    petBreed: string;
    petImageUrl: string;
    status: string;
    voteCount: number;
    moderationNote: string;
    rejectionReason: string;
    submittedAt: string | null;
  }>;
};
