import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GeoPoint, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import GoogleMapPicker, { type LatLngLiteral } from "@/components/maps/GoogleMapPicker";
import { useAuth } from "@/hooks/useAuth";
import { ADDRESS_CITIES, ADDRESS_COUNTRY, formatAddress, useAddresses } from "@/hooks/useAddresses";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { useToast } from "@/hooks/use-toast";
import { createMetaEventId, META_PIXEL_CURRENCY, trackMetaCustomEvent, trackMetaEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import {
  callableCode, callableMessage, cartCall, checkout, createPaymobPayment, formatMinor,
  type GuestAddressInput, type Quote,
} from "@/lib/catalogueApi";
import { readStoredPromo, writeStoredPromo } from "@/pages/catalogue-cart";

const PAYMOB_GUEST_TOKEN_STORAGE_PREFIX = "twopaws:paymob:guest-token:";
const GUEST_PENDING_ORDER_STORAGE_KEY = "twopaws:guest-checkout:pending-order";

const buildPaymobCheckoutUrl = (publicKey: string, clientSecret: string) =>
  `https://accept.paymob.com/unifiedcheckout/?${new URLSearchParams({ publicKey, clientSecret }).toString()}`;

type AddressFormState = {
  label: string; recipientName: string; phone: string; country: string; city: string; area: string;
  street: string; building: string; floor: string; apartment: string; notes: string; location: LatLngLiteral | null;
};
type CustomerFormState = { firstName: string; lastName: string; phone: string; email: string };

const emptyAddress = (label = ""): AddressFormState => ({
  label, recipientName: "", phone: "", country: ADDRESS_COUNTRY, city: ADDRESS_CITIES[0], area: "", street: "", building: "", floor: "", apartment: "", notes: "", location: null,
});

const splitFullName = (value?: string | null) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = normalized.split(" ");
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
};
const isValidOptionalEmail = (value: string) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const toLatLng = (location?: { latitude?: number; longitude?: number } | null) =>
  location && typeof location.latitude === "number" && typeof location.longitude === "number" ? ({ lat: location.latitude, lng: location.longitude } as LatLngLiteral) : null;
const newIdempotencyKey = () => (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, "");

export default function CatalogueCheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addresses, addAddress, updateAddress } = useAddresses();
  const { lines, guestItems, loading: cartLoading, clear } = useCatalogueCart();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const checkoutTrackingIdRef = useRef<string | null>(null);
  const initiateCheckoutTrackedRef = useRef(false);
  const paymentMethodsTrackedRef = useRef(new Set<string>());
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({ firstName: "", lastName: "", phone: "", email: "" });
  const [addressForm, setAddressForm] = useState<AddressFormState>(() => emptyAddress());
  const [guestAddressForm, setGuestAddressForm] = useState<AddressFormState>(() => emptyAddress("Delivery address"));
  /** Set on the first Place order tap; from then on missing or invalid fields show their message inline. */
  const [attempted, setAttempted] = useState(false);
  /** Delivery in EGP for the chosen city, from the suppliers' shipping zones, until the server quote arrives. */
  const [deliveryEstimate, setDeliveryEstimate] = useState<number | null>(null);

  const isGuestCheckout = !user;
  useEffect(() => { setPromoCode(readStoredPromo()); }, []);
  useEffect(() => {
    if (!user) return;
    const { firstName, lastName } = splitFullName(user.displayName);
    setCustomerForm((prev) => ({ firstName: prev.firstName || firstName, lastName: prev.lastName || lastName, phone: prev.phone, email: prev.email || user.email || "" }));
  }, [user]);
  useEffect(() => {
    if (addresses.length === 0) { if (selectedAddressId) setSelectedAddressId(""); return; }
    if (!selectedAddressId || !addresses.some((address) => address.id === selectedAddressId)) setSelectedAddressId(addresses[0].id);
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const cartEmpty = lines.length === 0;
  const guestPhone = customerForm.phone.trim();
  const guestAddressReady = Boolean(guestAddressForm.city && guestAddressForm.street.trim() && guestPhone.length >= 7 && guestAddressForm.location);
  const guestAddressPayload = useMemo<GuestAddressInput>(() => ({
    ...guestAddressForm,
    recipientName: `${customerForm.firstName} ${customerForm.lastName}`.trim(),
    phone: guestPhone,
    email: customerForm.email.trim() || null,
    location: guestAddressForm.location ? { lat: guestAddressForm.location.lat, lng: guestAddressForm.location.lng } : null,
  }), [guestAddressForm, customerForm.firstName, customerForm.lastName, customerForm.email, guestPhone]);
  const guestItemsKey = JSON.stringify(guestItems);

  const guestProblems: Record<string, string | null> | null = isGuestCheckout ? {
    firstName: customerForm.firstName.trim() ? null : "Enter your first name.",
    lastName: customerForm.lastName.trim() ? null : "Enter your last name.",
    phone: guestPhone && isValidPhoneNumber(guestPhone) ? null : "Enter a valid mobile number.",
    email: isValidOptionalEmail(customerForm.email) ? null : "Enter a valid email, or leave it empty.",
    street: guestAddressForm.street.trim() ? null : "Enter your street.",
    location: guestAddressForm.location ? null : "Set your delivery location on the map.",
  } : null;
  const problem = (key: string) => (attempted && guestProblems ? guestProblems[key] : null);

  // Each supplier charges per city, so the city alone is enough for a delivery estimate.
  const supplierIdsKey = [...new Set(lines.map((line) => line.supplierId).filter(Boolean))].sort().join(",");
  const estimateCity = isGuestCheckout ? guestAddressForm.city : (selectedAddress?.city ?? "");
  useEffect(() => {
    if (!supplierIdsKey || !estimateCity) { setDeliveryEstimate(null); return; }
    let cancelled = false;
    Promise.all(supplierIdsKey.split(",").map((supplierId) =>
      getDocs(collection(db, "suppliers", supplierId, "shippingZones")).then((snap) => {
        const zone = snap.docs.map((doc) => doc.data()).find((data) => data.label === estimateCity);
        return typeof zone?.rateEGP === "number" ? zone.rateEGP : null;
      }),
    ))
      .then((rates) => { if (!cancelled) setDeliveryEstimate(rates.every((rate) => rate !== null) ? rates.reduce<number>((sum, rate) => sum + (rate ?? 0), 0) : null); })
      .catch(() => { if (!cancelled) setDeliveryEstimate(null); });
    return () => { cancelled = true; };
  }, [supplierIdsKey, estimateCity]);

  if (!checkoutTrackingIdRef.current) checkoutTrackingIdRef.current = createMetaEventId("checkout");

  // Quote: server-priced lines, delivery per supplier, promo and the quoteId that checkout must echo back.
  useEffect(() => {
    if (authLoading || cartLoading || cartEmpty) { setQuote(null); return; }
    if (!isGuestCheckout && !selectedAddressId) { setQuote(null); return; }
    if (isGuestCheckout && !guestAddressReady) { setQuote(null); setQuoteError(null); return; }
    let active = true;
    setQuoteLoading(true);
    setQuoteError(null);
    const timer = window.setTimeout(() => {
      const request = isGuestCheckout
        ? cartCall<Quote>({ operation: "quote", items: guestItems, address: guestAddressPayload, promoCode })
        : cartCall<Quote>({ operation: "quote", addressId: selectedAddressId, promoCode });
      request
        .then((data) => { if (active) setQuote(data); })
        .catch((error) => {
          if (!active) return;
          setQuote(null);
          const code = callableCode(error);
          if (promoCode && (code === "not-found" || code === "failed-precondition") && /promo|minimum order/i.test(callableMessage(error))) {
            setQuoteError(`${callableMessage(error)} Remove the promo code to continue.`);
          } else {
            setQuoteError(callableMessage(error));
          }
        })
        .finally(() => { if (active) setQuoteLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
    // guestItems is covered by guestItemsKey; lines.length triggers requotes when the account cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, cartLoading, cartEmpty, isGuestCheckout, selectedAddressId, guestAddressReady, guestAddressPayload, guestItemsKey, promoCode, quoteVersion, lines.length]);

  const pixelContents = useMemo(() => lines.map((line) => ({ id: line.productId || line.offerId, quantity: line.quantity, item_price: line.unitPriceMinor / 100 })), [lines]);
  const pixelItemCount = useMemo(() => pixelContents.reduce((sum, item) => sum + item.quantity, 0), [pixelContents]);
  useEffect(() => {
    if (initiateCheckoutTrackedRef.current || !quote) return;
    trackMetaEvent("InitiateCheckout", { content_ids: pixelContents.map((item) => item.id), contents: pixelContents, value: quote.totalMinor / 100, currency: META_PIXEL_CURRENCY, num_items: pixelItemCount }, { eventId: `${checkoutTrackingIdRef.current}_initiate` });
    initiateCheckoutTrackedRef.current = true;
  }, [quote, pixelContents, pixelItemCount]);

  const handlePaymentMethodChange = (value: string) => {
    const method = value === "card" ? "card" : "cash";
    setPaymentMethod(method);
    if (!quote || paymentMethodsTrackedRef.current.has(method)) return;
    trackMetaEvent("AddPaymentInfo", { content_ids: pixelContents.map((item) => item.id), contents: pixelContents, value: quote.totalMinor / 100, currency: META_PIXEL_CURRENCY, num_items: pixelItemCount, payment_method: method }, { eventId: `${checkoutTrackingIdRef.current}_payment_${method}` });
    paymentMethodsTrackedRef.current.add(method);
  };

  const resetAddressForm = () => { setAddressForm(emptyAddress()); setEditingAddressId(null); };
  const openEditAddress = (address: (typeof addresses)[number]) => {
    setEditingAddressId(address.id);
    setSelectedAddressId(address.id);
    setAddressForm({
      label: address.label ?? "", recipientName: address.recipientName ?? "", phone: address.phone ?? "", country: ADDRESS_COUNTRY,
      city: ADDRESS_CITIES.includes((address.city ?? "") as (typeof ADDRESS_CITIES)[number]) ? (address.city as (typeof ADDRESS_CITIES)[number]) : ADDRESS_CITIES[0],
      area: address.area ?? "", street: address.street ?? "", building: address.building ?? "", floor: address.floor ?? "", apartment: address.apartment ?? "", notes: address.notes ?? "",
      location: toLatLng(address.location as { latitude?: number; longitude?: number } | null),
    });
    setIsAddressDialogOpen(true);
  };
  const handleSaveAddress = async () => {
    if (!ADDRESS_CITIES.includes(addressForm.city as (typeof ADDRESS_CITIES)[number])) { toast({ title: "Invalid city", description: "City must be Cairo or Giza.", variant: "destructive" }); return; }
    if (!addressForm.phone.trim() || !isValidPhoneNumber(addressForm.phone)) { toast({ title: "Invalid phone number", description: "Enter a valid phone number with country code.", variant: "destructive" }); return; }
    if (!addressForm.street.trim()) { toast({ title: "Street required", description: "Enter the street for delivery.", variant: "destructive" }); return; }
    if (!addressForm.location) { toast({ title: "Location required", description: "Select the address location on the map.", variant: "destructive" }); return; }
    try {
      const payload = {
        ...addressForm, phone: addressForm.phone.trim(), country: ADDRESS_COUNTRY,
        // line1 mirrors the app's address shape so the catalogue quote accepts either.
        line1: [addressForm.street.trim(), addressForm.building.trim()].filter(Boolean).join(", "),
        location: new GeoPoint(addressForm.location.lat, addressForm.location.lng),
      };
      if (editingAddressId) await updateAddress(editingAddressId, payload); else await addAddress(payload);
      resetAddressForm();
      setIsAddressDialogOpen(false);
      setQuoteVersion((v) => v + 1);
    } catch (err) {
      toast({ title: "Unable to save address", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleCheckout = async () => {
    if (cartEmpty) { toast({ title: "Cart empty", description: "Add items before checkout." }); return; }
    const firstName = customerForm.firstName.trim(), lastName = customerForm.lastName.trim(), email = customerForm.email.trim();
    if (isGuestCheckout && guestProblems) {
      setAttempted(true);
      const firstProblem = Object.keys(guestProblems).find((key) => guestProblems[key]);
      if (firstProblem) {
        // Show the shopper the first thing to fix instead of a toast that disappears.
        const field = document.getElementById(`guest-${firstProblem}`);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (field instanceof HTMLInputElement) field.focus({ preventScroll: true });
        return;
      }
    } else if (!selectedAddress) {
      toast({ title: "Select an address", description: "Choose or add a shipping address to continue.", variant: "destructive" }); return;
    }
    if (!quote) { toast({ title: "Checkout not ready", description: quoteError || "Wait for the server to confirm pricing and delivery.", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      idempotencyKeyRef.current ??= newIdempotencyKey();
      const base = { idempotencyKey: idempotencyKeyRef.current, paymentMethod, quoteId: quote.quoteId, promoCode: promoCode || undefined, source: "website" as const };
      const order = await checkout(isGuestCheckout
        ? { ...base, items: guestItems, address: guestAddressPayload, customer: { firstName, lastName, phone: guestPhone, email: email || null } }
        : { ...base, addressId: selectedAddressId });
      if (!order.orderId) throw new Error("Unable to create order.");
      writeStoredPromo("");

      if (order.guestCheckoutToken) {
        window.sessionStorage.setItem(`${PAYMOB_GUEST_TOKEN_STORAGE_PREFIX}${order.orderId}`, order.guestCheckoutToken);
        // The pending marker tells the return page to clear the guest cart once the card payment is confirmed; cash clears it here.
        if (paymentMethod === "card") window.sessionStorage.setItem(GUEST_PENDING_ORDER_STORAGE_KEY, order.orderId);
      }

      if (paymentMethod === "card") {
        const payment = await createPaymobPayment(order.orderId, order.guestCheckoutToken);
        if (!payment?.clientSecret || !payment?.publicKey) throw new Error("Unable to start Paymob payment.");
        window.location.assign(buildPaymobCheckoutUrl(payment.publicKey, payment.clientSecret));
        return;
      }

      trackMetaCustomEvent("OrderPlaced", { content_ids: pixelContents.map((item) => item.id), contents: pixelContents, value: order.totalMinor / 100, currency: META_PIXEL_CURRENCY, num_items: pixelItemCount, order_id: order.orderId, payment_method: "cash" }, { eventId: createMetaEventId("OrderPlaced", order.orderId) });
      idempotencyKeyRef.current = null;
      if (isGuestCheckout) {
        await clear();
        toast({ title: "Order placed", description: `Your order #${order.orderNumber} has been received.` });
        navigate(`/payment/return?orderId=${encodeURIComponent(order.orderId)}`);
      } else {
        navigate(`/orders/${order.orderId}`);
      }
    } catch (err) {
      if (callableCode(err) === "aborted") {
        idempotencyKeyRef.current = null;
        setQuoteVersion((v) => v + 1);
        toast({ title: "Prices or delivery changed", description: "Review the updated total, then place the order again.", variant: "destructive" });
      } else {
        toast({ title: "Checkout failed", description: callableMessage(err), variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const seo = <Seo title="Checkout | TwoPaws Shop" description="Complete your TwoPaws order securely." canonicalUrl="/checkout/" noIndex />;
  if (authLoading) return <ShopShell>{seo}<p className="text-sm text-slate-500">Loading...</p></ShopShell>;

  const fieldError = (id: string, message: string | null) =>
    message ? <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{message}</p> : null;

  /** `prefix` keeps ids unique between the guest form ("guest") and the saved-address dialog ("addr"). */
  const addressFields = (form: AddressFormState, setForm: React.Dispatch<React.SetStateAction<AddressFormState>>, withContact: boolean, prefix: string) => {
    const err = (key: string) => (prefix === "guest" ? problem(key) : null);
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {withContact && (
            <>
              <div><Label htmlFor={`${prefix}-label`}>Label</Label><Input id={`${prefix}-label`} placeholder="Home, Work…" value={form.label} onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))} /></div>
              <div><Label htmlFor={`${prefix}-recipient`}>Recipient name</Label><Input id={`${prefix}-recipient`} autoComplete="name" value={form.recipientName} onChange={(event) => setForm((prev) => ({ ...prev, recipientName: event.target.value }))} /></div>
              <div><Label htmlFor={`${prefix}-phone`}>Phone</Label><PhoneInput id={`${prefix}-phone`} autoComplete="tel" className="auth-phone-input" defaultCountry="EG" international countryCallingCodeEditable={false} value={form.phone || undefined} onChange={(value) => setForm((prev) => ({ ...prev, phone: value ?? "" }))} placeholder="Enter phone number" /></div>
              <div><Label htmlFor={`${prefix}-country`}>Country</Label><Input id={`${prefix}-country`} value={ADDRESS_COUNTRY} disabled className="bg-slate-50" /></div>
            </>
          )}
          <div>
            <Label htmlFor={`${prefix}-city`}>City</Label>
            <Select value={form.city} onValueChange={(value) => setForm((prev) => ({ ...prev, city: value }))}>
              <SelectTrigger id={`${prefix}-city`} className="h-10"><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>{ADDRESS_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label htmlFor={`${prefix}-area`}>Area</Label><Input id={`${prefix}-area`} autoComplete="address-level3" placeholder="e.g. Maadi" value={form.area} onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))} /></div>
          <div>
            <Label htmlFor={`${prefix}-street`}>Street</Label>
            <Input id={`${prefix}-street`} autoComplete="address-line1" aria-invalid={Boolean(err("street"))} aria-describedby={err("street") ? `${prefix}-street-error` : undefined} value={form.street} onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))} />
            {fieldError(`${prefix}-street`, err("street"))}
          </div>
          <div><Label htmlFor={`${prefix}-building`}>Building</Label><Input id={`${prefix}-building`} autoComplete="address-line2" value={form.building} onChange={(event) => setForm((prev) => ({ ...prev, building: event.target.value }))} /></div>
          <div><Label htmlFor={`${prefix}-floor`}>Floor</Label><Input id={`${prefix}-floor`} inputMode="numeric" value={form.floor} onChange={(event) => setForm((prev) => ({ ...prev, floor: event.target.value }))} /></div>
          <div><Label htmlFor={`${prefix}-apartment`}>Apartment</Label><Input id={`${prefix}-apartment`} value={form.apartment} onChange={(event) => setForm((prev) => ({ ...prev, apartment: event.target.value }))} /></div>
        </div>
        <div><Label htmlFor={`${prefix}-notes`}>Notes for the courier</Label><Textarea id={`${prefix}-notes`} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></div>
        <div id={`${prefix}-location`} className="scroll-mt-40 space-y-2">
          <p className="text-sm font-medium leading-none">Location on the map</p>
          <GoogleMapPicker value={form.location} onChange={(loc) => setForm((prev) => ({ ...prev, location: loc }))} heightClassName="h-52 sm:h-64" />
          {err("location") ? fieldError(`${prefix}-location`, err("location")) : <p className="text-xs text-slate-500">Tap the map, or use your current location, to set the exact delivery point.</p>}
        </div>
      </div>
    );
  };

  const subtotalMinor = quote?.subtotalMinor ?? lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const deliveryText = quote ? formatMinor(quote.shippingMinor) : deliveryEstimate !== null ? formatMinor(deliveryEstimate * 100) : "—";
  const totalText = quote ? formatMinor(quote.totalMinor) : deliveryEstimate !== null && !cartEmpty ? `≈ ${formatMinor(subtotalMinor + deliveryEstimate * 100)}` : "—";
  // Guests can tap before the quote exists: the tap points out what is missing instead of doing nothing.
  const placeOrderButton = (className: string) => (
    <Button className={`${className} bg-brand-green-dark text-white hover:bg-brand-green-dark/90`} onClick={handleCheckout} disabled={submitting || quoteLoading || cartEmpty || (!quote && !isGuestCheckout)}>
      {submitting ? "Placing order..." : paymentMethod === "card" ? "Continue to payment" : "Place order"}
    </Button>
  );
  const mobileBar = cartEmpty ? undefined : (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Total{!quote && deliveryEstimate !== null ? " (estimate)" : ""}</p>
        <p className="text-lg font-semibold text-slate-900">{totalText}</p>
      </div>
      {placeOrderButton("h-11 shrink-0 rounded-full px-6")}
    </div>
  );

  return (
    <ShopShell mobileBar={mobileBar}>
      {seo}
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-green-dark">Checkout</p>
        <h1 className="text-3xl font-semibold text-slate-900">Complete your order</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {isGuestCheckout && (
            <>
              <p className="text-sm text-slate-600">
                Checking out as a guest.{" "}
                <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="font-semibold text-brand-green-dark underline-offset-2 hover:underline">Sign in</Link>
                {" "}for faster checkout.
              </p>
              <Card className="border-slate-100">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-lg font-semibold text-slate-900">Customer details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="guest-firstName">First name</Label>
                      <Input id="guest-firstName" autoComplete="given-name" aria-invalid={Boolean(problem("firstName"))} aria-describedby={problem("firstName") ? "guest-firstName-error" : undefined} value={customerForm.firstName} onChange={(event) => setCustomerForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                      {fieldError("guest-firstName", problem("firstName"))}
                    </div>
                    <div>
                      <Label htmlFor="guest-lastName">Last name</Label>
                      <Input id="guest-lastName" autoComplete="family-name" aria-invalid={Boolean(problem("lastName"))} aria-describedby={problem("lastName") ? "guest-lastName-error" : undefined} value={customerForm.lastName} onChange={(event) => setCustomerForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                      {fieldError("guest-lastName", problem("lastName"))}
                    </div>
                    <div>
                      <Label htmlFor="guest-phone">Mobile number</Label>
                      <PhoneInput id="guest-phone" autoComplete="tel" className="auth-phone-input" defaultCountry="EG" international countryCallingCodeEditable={false} value={customerForm.phone || undefined} onChange={(value) => setCustomerForm((prev) => ({ ...prev, phone: value ?? "" }))} placeholder="Enter phone number" />
                      {fieldError("guest-phone", problem("phone"))}
                    </div>
                    <div>
                      <Label htmlFor="guest-email">Email (optional)</Label>
                      <Input id="guest-email" type="email" autoComplete="email" aria-invalid={Boolean(problem("email"))} aria-describedby={problem("email") ? "guest-email-error" : undefined} value={customerForm.email} onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))} />
                      {fieldError("guest-email", problem("email"))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-100">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-lg font-semibold text-slate-900">Shipping address</h3>
                  {addressFields(guestAddressForm, setGuestAddressForm, false, "guest")}
                </CardContent>
              </Card>
            </>
          )}

          {!isGuestCheckout && (
            <>
              <Card className="border-slate-100">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-lg font-semibold text-slate-900">Shipping address</h3>
                  <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-2">
                    {addresses.map((address) => (
                      <label key={address.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                        <RadioGroupItem value={address.id} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{address.label ?? "Saved address"}</p>
                          <p className="text-xs text-slate-500">{formatAddress(address)}</p>
                        </div>
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openEditAddress(address); }} className="text-xs font-semibold text-brand-green-dark hover:underline">Edit</button>
                      </label>
                    ))}
                    {addresses.length === 0 && <p className="text-sm text-slate-500">No saved addresses yet.</p>}
                  </RadioGroup>
                  <Button className="bg-brand-green-dark text-white" onClick={() => { resetAddressForm(); setIsAddressDialogOpen(true); }}>Add address</Button>
                </CardContent>
              </Card>
              <Dialog open={isAddressDialogOpen} onOpenChange={(open) => { setIsAddressDialogOpen(open); if (!open) resetAddressForm(); }}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
                  <DialogHeader><DialogTitle>{editingAddressId ? "Edit address" : "Add new address"}</DialogTitle></DialogHeader>
                  {addressFields(addressForm, setAddressForm, true, "addr")}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="bg-brand-green-dark text-white" onClick={handleSaveAddress}>{editingAddressId ? "Update address" : "Save address"}</Button>
                    <Button variant="outline" className="border-slate-200" onClick={() => { resetAddressForm(); setIsAddressDialogOpen(false); }}>Cancel</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900">Payment method</h3>
              <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange} className="space-y-2">
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <RadioGroupItem value="cash" />
                  <div><p className="text-sm font-semibold text-slate-900">Cash on Delivery</p><p className="text-xs text-slate-500">Pay when your order arrives.</p></div>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <RadioGroupItem value="card" />
                  <div><p className="text-sm font-semibold text-slate-900">Card</p><p className="text-xs text-slate-500">Pay using your debit or credit card on a secure payment page.</p></div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-100">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Order summary</h3>
              {(quote?.items ?? lines).map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-2 text-xs text-slate-600">
                  <span className="line-clamp-2">{line.quantity} × {line.name}{line.label && line.label.trim().toLowerCase() !== line.name.trim().toLowerCase() ? ` (${line.label})` : ""}{line.supplierName ? ` · ${line.supplierName}` : ""}</span>
                  <span className="shrink-0">{formatMinor(line.lineTotalMinor)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatMinor(quote?.subtotalMinor ?? lines.reduce((sum, line) => sum + line.lineTotalMinor, 0))}</span></div>
                {quote && quote.discountMinor > 0 && <div className="flex items-center justify-between text-sm text-slate-600"><span>Promo {quote.promoCode ? `(${quote.promoCode.toUpperCase()})` : ""}</span><span>-{formatMinor(quote.discountMinor)}</span></div>}
                <div className="flex items-center justify-between text-sm text-slate-600"><span>Delivery{!quote && deliveryEstimate !== null ? " (estimate)" : ""}</span><span>{deliveryText}</span></div>
                <div className="flex items-center justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{totalText}</span></div>
              </div>
              {quoteLoading ? <p className="text-xs text-slate-500">Confirming prices and delivery...</p>
                : quoteError ? <p className="text-xs text-red-600">{quoteError}</p>
                : quote?.eta ? <p className="text-xs text-slate-500">Estimated delivery: {quote.eta}</p>
                : !quote && isGuestCheckout ? <p className="text-xs text-slate-500">{deliveryEstimate !== null ? `Delivery to ${estimateCity} estimated. Add your street and map pin to confirm the total.` : "Enter your phone, street and map location to see delivery and total."}</p>
                : null}
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Promo code</h3>
              <div className="flex items-center gap-2">
                <Input placeholder="Enter promo code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} onBlur={() => writeStoredPromo(promoCode)} />
                {promoCode && <Button variant="outline" className="border-slate-200" onClick={() => { setPromoCode(""); writeStoredPromo(""); }}>Remove</Button>}
              </div>
            </CardContent>
          </Card>

          {placeOrderButton("w-full")}
          <p className="text-center text-xs text-slate-500">
            By placing an order you accept our <Link to="/terms/" className="underline">terms</Link> and{" "}
            <Link to="/shipping-and-returns/" className="underline">shipping and returns policy</Link>.
          </p>
        </div>
      </div>
    </ShopShell>
  );
}
