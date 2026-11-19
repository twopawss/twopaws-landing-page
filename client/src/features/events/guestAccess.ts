const PREFIX = "twopaws:event-order:";

export type GuestOrderAccess = {
  orderId: string;
  eventSlug: string;
  guestCheckoutToken: string;
  createdAt: string;
};

export const createGuestToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};

export const saveGuestOrderAccess = (access: GuestOrderAccess) => {
  localStorage.setItem(`${PREFIX}${access.orderId}`, JSON.stringify(access));
  sessionStorage.setItem("twopaws:pending-event-order", access.orderId);
};

export const getGuestOrderAccess = (orderId: string) => {
  const raw = localStorage.getItem(`${PREFIX}${orderId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestOrderAccess;
  } catch {
    return null;
  }
};

export const listGuestOrders = () =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => getGuestOrderAccess(key.slice(PREFIX.length)))
    .filter((value): value is GuestOrderAccess => Boolean(value))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
