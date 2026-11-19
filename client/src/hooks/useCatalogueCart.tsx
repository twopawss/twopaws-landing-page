import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import { cartCall, type CartLine, type CartView, type GuestCartItem } from "@/lib/catalogueApi";

/**
 * Cart on the catalogue backend. Signed-in users have a server cart (users/{uid}/catalogueCart) that only
 * catalogueCart may change; guests keep offer ids and quantities in localStorage and have the server price
 * them. On sign-in the guest rows are added to the account cart once, then the local copy is dropped.
 */

const GUEST_STORAGE_KEY = "twopaws:catalogue-cart:v1";
const MAX_QUANTITY = 99;

type CatalogueCartValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalMinor: number;
  loading: boolean;
  message: string;
  error: string | null;
  quantityByOffer: Record<string, number>;
  quantityByProduct: Record<string, number>;
  add: (offerId: string, quantity: number) => Promise<void>;
  setQuantity: (offerId: string, quantity: number) => Promise<void>;
  remove: (offerId: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Guest rows as the callables expect them; empty for signed-in users. */
  guestItems: GuestCartItem[];
};

const CatalogueCartContext = createContext<CatalogueCartValue | null>(null);

const clampQuantity = (value: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(value)));

export const readGuestCatalogueCart = (): GuestCartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    const merged = new Map<string, number>();
    for (const raw of parsed) {
      const row = (raw ?? {}) as Record<string, unknown>;
      const offerId = typeof row.offerId === "string" ? row.offerId.trim() : "";
      const quantity = clampQuantity(Number(row.quantity));
      if (!offerId || quantity <= 0) continue;
      merged.set(offerId, clampQuantity((merged.get(offerId) ?? 0) + quantity));
    }
    return [...merged].map(([offerId, quantity]) => ({ offerId, quantity }));
  } catch {
    return [];
  }
};

const writeGuestCatalogueCart = (items: GuestCartItem[]) => {
  if (typeof window === "undefined") return;
  if (!items.length) window.localStorage.removeItem(GUEST_STORAGE_KEY);
  else window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
};

const emptyView: CartView = { items: [], subtotalMinor: 0, currency: "EGP", message: "" };

function useCatalogueCartState(): CatalogueCartValue {
  const prerender = isReactSnapPrerender();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const [view, setView] = useState<CartView>(emptyView);
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(() => (prerender ? [] : readGuestCatalogueCart()));
  const [loading, setLoading] = useState(!prerender);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const applyView = useCallback((version: number, next: CartView) => {
    if (versionRef.current !== version) return;
    setView(next);
    setError(null);
  }, []);

  const priceGuest = useCallback(async (items: GuestCartItem[]) => {
    const version = ++versionRef.current;
    if (!items.length) {
      applyView(version, emptyView);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      applyView(version, await cartCall({ operation: "get", items }));
    } catch (err) {
      if (versionRef.current === version) setError((err as Error).message);
    } finally {
      if (versionRef.current === version) setLoading(false);
    }
  }, [applyView]);

  const loadAccount = useCallback(async () => {
    const version = ++versionRef.current;
    setLoading(true);
    try {
      applyView(version, await cartCall({ operation: "get" }));
    } catch (err) {
      if (versionRef.current === version) setError((err as Error).message);
    } finally {
      if (versionRef.current === version) setLoading(false);
    }
  }, [applyView]);

  // Guest: price the stored rows. Signed in: merge any guest rows once, then load the account cart.
  useEffect(() => {
    if (prerender || authLoading) return;
    if (!uid) {
      void priceGuest(guestItems);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const pending = readGuestCatalogueCart();
      for (const row of pending) {
        try {
          await cartCall({ operation: "add", offerId: row.offerId, quantity: row.quantity });
        } catch {
          // An offer that is no longer available is simply not carried over.
        }
      }
      if (pending.length) {
        writeGuestCatalogueCart([]);
        if (!cancelled) setGuestItems([]);
      }
      if (!cancelled) await loadAccount();
    };
    void run();
    return () => {
      cancelled = true;
    };
    // guestItems is intentionally not a dependency: guest rows are re-priced through updateGuest below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, authLoading, prerender, loadAccount, priceGuest]);

  const updateGuest = useCallback(async (next: GuestCartItem[]) => {
    const items = next.filter((row) => row.quantity > 0);
    writeGuestCatalogueCart(items);
    setGuestItems(items);
    await priceGuest(items);
  }, [priceGuest]);

  const runAccount = useCallback(async (request: Parameters<typeof cartCall>[0]) => {
    const version = ++versionRef.current;
    setLoading(true);
    try {
      applyView(version, await cartCall(request));
    } finally {
      if (versionRef.current === version) setLoading(false);
    }
  }, [applyView]);

  const add = useCallback(async (offerId: string, quantity: number) => {
    const amount = clampQuantity(quantity);
    if (amount <= 0) return;
    if (uid) {
      await runAccount({ operation: "add", offerId, quantity: amount });
      return;
    }
    const existing = guestItems.find((row) => row.offerId === offerId);
    const nextQuantity = clampQuantity((existing?.quantity ?? 0) + amount);
    await updateGuest(existing
      ? guestItems.map((row) => (row.offerId === offerId ? { offerId, quantity: nextQuantity } : row))
      : [...guestItems, { offerId, quantity: nextQuantity }]);
  }, [uid, guestItems, runAccount, updateGuest]);

  const setQuantity = useCallback(async (offerId: string, quantity: number) => {
    const amount = clampQuantity(quantity);
    if (uid) {
      await runAccount(amount <= 0 ? { operation: "remove", offerId } : { operation: "set", offerId, quantity: amount });
      return;
    }
    await updateGuest(amount <= 0
      ? guestItems.filter((row) => row.offerId !== offerId)
      : guestItems.some((row) => row.offerId === offerId)
        ? guestItems.map((row) => (row.offerId === offerId ? { offerId, quantity: amount } : row))
        : [...guestItems, { offerId, quantity: amount }]);
  }, [uid, guestItems, runAccount, updateGuest]);

  const remove = useCallback((offerId: string) => setQuantity(offerId, 0), [setQuantity]);

  const clear = useCallback(async () => {
    if (uid) {
      await runAccount({ operation: "clear" });
      return;
    }
    await updateGuest([]);
  }, [uid, runAccount, updateGuest]);

  const refresh = useCallback(async () => {
    if (uid) await loadAccount();
    else await priceGuest(guestItems);
  }, [uid, guestItems, loadAccount, priceGuest]);

  const lines = view.items;
  const quantityByOffer = useMemo(
    () => lines.reduce<Record<string, number>>((acc, line) => { acc[line.offerId] = line.quantity; return acc; }, {}),
    [lines]
  );
  const quantityByProduct = useMemo(
    () => lines.reduce<Record<string, number>>((acc, line) => {
      if (!line.productId) return acc;
      acc[line.productId] = (acc[line.productId] ?? 0) + line.quantity;
      return acc;
    }, {}),
    [lines]
  );
  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  return {
    lines,
    itemCount,
    subtotalMinor: view.subtotalMinor,
    loading,
    message: view.message,
    error,
    quantityByOffer,
    quantityByProduct,
    add,
    setQuantity,
    remove,
    clear,
    refresh,
    guestItems: uid ? [] : guestItems,
  };
}

export function CatalogueCartProvider({ children }: { children: React.ReactNode }) {
  const value = useCatalogueCartState();
  return <CatalogueCartContext.Provider value={value}>{children}</CatalogueCartContext.Provider>;
}

export function useCatalogueCart() {
  const context = useContext(CatalogueCartContext);
  if (!context) throw new Error("useCatalogueCart must be used within CatalogueCartProvider");
  return context;
}
