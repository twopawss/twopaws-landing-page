type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const META_PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const META_PIXEL_CURRENCY = "EGP";
const META_FBC_STORAGE_KEY = "twopaws:meta:fbc";
const META_FBC_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

type MetaEventOptions = {
  eventId?: string;
};

let initialized = false;

const getPixelId = () => {
  const id = import.meta.env.VITE_META_PIXEL_ID;
  return typeof id === "string" ? id.trim() : "";
};

const setFbcCookie = (value: string) => {
  document.cookie = `_fbc=${encodeURIComponent(value)}; Max-Age=${META_FBC_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; Secure`;
};

export const persistMetaClickId = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const fbclid = new URLSearchParams(window.location.search).get("fbclid")?.trim();
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    window.localStorage.setItem(META_FBC_STORAGE_KEY, fbc);
    setFbcCookie(fbc);
    return fbc;
  }

  const hasFbcCookie = document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("_fbc="));
  if (hasFbcCookie) return;

  const storedFbc = window.localStorage.getItem(META_FBC_STORAGE_KEY);
  if (storedFbc) {
    setFbcCookie(storedFbc);
    return storedFbc;
  }
};

const ensureBase = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (window.fbq) return true;

  const fbq: Fbq = ((...args: unknown[]) => {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue?.push(args);
  }) as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = (...args: unknown[]) => fbq.queue?.push(args);

  window.fbq = fbq;
  window._fbq = fbq;

  if (!document.querySelector('script[data-meta-pixel="true"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = META_PIXEL_SRC;
    script.setAttribute("data-meta-pixel", "true");
    document.head.appendChild(script);
  }

  return true;
};

export const initMetaPixel = (pixelId = getPixelId()) => {
  if (initialized) return true;
  if (!pixelId) return false;
  if (!ensureBase()) return false;
  window.fbq?.("set", "autoConfig", false, pixelId);
  window.fbq?.("init", pixelId);
  initialized = true;
  return true;
};

export const createMetaEventId = (event: string, stableKey?: string) => {
  const normalizedEvent = event.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const normalizedKey = stableKey?.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  if (normalizedKey) return `${normalizedEvent}_${normalizedKey}`;
  const randomPart = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${normalizedEvent}_${randomPart}`;
};

export const trackPageView = (options: MetaEventOptions = {}) => {
  if (!initMetaPixel()) return;
  const eventId = options.eventId ?? createMetaEventId("PageView");
  window.fbq?.("track", "PageView", {}, { eventID: eventId });
  return eventId;
};

const trackEvent = (
  command: "track" | "trackCustom",
  event: string,
  params?: Record<string, unknown>,
  options: MetaEventOptions = {}
) => {
  if (!initMetaPixel()) return;
  const eventId = options.eventId ?? createMetaEventId(event);
  window.fbq?.(command, event, params ?? {}, { eventID: eventId });
  return eventId;
};

export const trackMetaEvent = (
  event: string,
  params?: Record<string, unknown>,
  options?: MetaEventOptions
) => trackEvent("track", event, params, options);

export const trackMetaCustomEvent = (
  event: string,
  params?: Record<string, unknown>,
  options?: MetaEventOptions
) => trackEvent("trackCustom", event, params, options);

export { META_PIXEL_CURRENCY };
