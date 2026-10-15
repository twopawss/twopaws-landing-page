import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogueCart } from "@/hooks/useCatalogueCart";
import { useToast } from "@/hooks/use-toast";
import { META_PIXEL_CURRENCY, trackMetaEvent } from "@/lib/metaPixel";
import { callableMessage, formatMinor, type CartLine } from "@/lib/catalogueApi";
import Seo from "@/lib/seo/Seo";

/** The promo code is kept until checkout, where the quote validates it against the server. */
export const CATALOGUE_PROMO_STORAGE_KEY = "twopaws:catalogue-promo";
export const readStoredPromo = () => {
  try { return (window.localStorage.getItem(CATALOGUE_PROMO_STORAGE_KEY) ?? "").trim(); } catch { return ""; }
};
export const writeStoredPromo = (code: string) => {
  try {
    if (code.trim()) window.localStorage.setItem(CATALOGUE_PROMO_STORAGE_KEY, code.trim());
    else window.localStorage.removeItem(CATALOGUE_PROMO_STORAGE_KEY);
  } catch { /* storage unavailable */ }
};

const lineForPixel = (line: CartLine) => ({ id: line.productId || line.offerId, quantity: line.quantity, item_price: line.unitPriceMinor / 100 });

export default function CatalogueCartPage() {
  const { user } = useAuth();
  const { lines, subtotalMinor, itemCount, loading, message, error, setQuantity, remove, clear, refresh } = useCatalogueCart();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [storedPromo, setStoredPromo] = useState("");
  const [busyOffer, setBusyOffer] = useState<string | null>(null);

  useEffect(() => {
    const code = readStoredPromo();
    setStoredPromo(code);
    setPromoCode(code);
  }, []);

  const applyPromo = () => {
    const code = promoCode.trim();
    writeStoredPromo(code);
    setStoredPromo(code);
    toast({ title: code ? "Promo saved" : "Promo removed", description: code ? "It is checked and applied at checkout." : undefined });
  };

  const changeQuantity = async (line: CartLine, next: number) => {
    setBusyOffer(line.offerId);
    try {
      await setQuantity(line.offerId, next);
      if (next <= 0) {
        trackMetaEvent("RemoveFromCart", { content_ids: [line.productId], content_type: "product", content_name: line.name, value: line.lineTotalMinor / 100, currency: META_PIXEL_CURRENCY, contents: [lineForPixel(line)] });
      }
    } catch (err) {
      toast({ title: "Unable to update", description: callableMessage(err), variant: "destructive" });
    } finally {
      setBusyOffer(null);
    }
  };

  const handleClear = async () => {
    const removed = lines.map(lineForPixel);
    try {
      await clear();
      writeStoredPromo("");
      setStoredPromo("");
      setPromoCode("");
      if (removed.length) trackMetaEvent("RemoveFromCart", { content_ids: removed.map((r) => r.id), content_type: "product", contents: removed, value: subtotalMinor / 100, currency: META_PIXEL_CURRENCY, num_items: itemCount });
    } catch (err) {
      toast({ title: "Unable to clear cart", description: callableMessage(err), variant: "destructive" });
    }
  };

  const cartEmpty = lines.length === 0;
  const hasUnavailable = lines.some((line) => line.available === false);
  const supplierNames = [...new Set(lines.map((line) => line.supplierName).filter(Boolean))];

  return (
    <ShopShell>
      <Seo title="Cart | TwoPaws Shop" description="Review and update items in your TwoPaws shopping cart." canonicalUrl="/cart/" noIndex />
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-olive">Cart</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your cart</h1>
        {supplierNames.length > 0 && <p className="text-sm text-slate-500">{supplierNames.length === 1 ? `Sold by ${supplierNames[0]}` : `From ${supplierNames.length} suppliers: ${supplierNames.join(", ")}`}</p>}
      </header>

      {!user && (
        <Card className="border-slate-100">
          <CardContent className="space-y-3 p-6">
            <p className="text-slate-600">You are shopping as guest. Sign in to keep your cart across devices.</p>
            <Button asChild variant="outline" className="border-slate-200"><Link to="/login?redirect=/cart">Sign in</Link></Button>
          </CardContent>
        </Card>
      )}

      {(message || error) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-amber-900">
            <span>{error ?? message}</span>
            <Button variant="outline" className="border-amber-300" onClick={() => { void refresh(); }}>Refresh</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {loading && cartEmpty && <Card className="border-slate-100"><CardContent className="p-6 text-slate-500">Loading your cart...</CardContent></Card>}
          {!loading && cartEmpty && <Card className="border-slate-100"><CardContent className="p-6 text-slate-600">Your cart is empty.</CardContent></Card>}
          {lines.map((line) => {
            const unavailable = line.available === false;
            const busy = busyOffer === line.offerId;
            return (
              <Card key={line.id} className={`border-slate-100 ${unavailable ? "opacity-80" : ""}`}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <Link to={line.productId ? `/shop/product/${line.productId}/` : "/shop/"} className="flex h-20 w-20 items-center justify-center">
                    {line.image ? <img src={line.image} alt={line.name} className="h-20 w-20 rounded-xl object-contain" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>}
                  </Link>
                  <div className="flex-1">
                    <Link to={line.productId ? `/shop/product/${line.productId}/` : "/shop/"} className="text-lg font-semibold text-slate-900 hover:text-brand-green-dark">{line.name}</Link>
                    <p className="text-sm text-slate-500">
                      {unavailable ? line.label : [line.label.trim().toLowerCase() === line.name.trim().toLowerCase() ? "" : line.label, line.supplierName ? `from ${line.supplierName}` : ""].filter(Boolean).join(" · ")}
                    </p>
                    {!unavailable && <p className="text-sm text-slate-500">{formatMinor(line.unitPriceMinor)} each</p>}
                  </div>
                  {!unavailable && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="border-slate-200" disabled={busy || line.quantity <= 1} onClick={() => changeQuantity(line, line.quantity - 1)}>-</Button>
                      <Input type="number" min={1} max={99} value={line.quantity} disabled={busy} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) void changeQuantity(line, next); }} className="w-20 text-center" />
                      <Button variant="outline" className="border-slate-200" disabled={busy || line.quantity >= 99} onClick={() => changeQuantity(line, line.quantity + 1)}>+</Button>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-semibold text-slate-900">{unavailable ? "Unavailable" : formatMinor(line.lineTotalMinor)}</p>
                    <Button variant="ghost" className="text-xs text-slate-500" disabled={busy} onClick={() => { void remove(line.offerId); }}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!cartEmpty && <Button variant="outline" className="border-slate-200 text-slate-700" onClick={handleClear}>Clear cart</Button>}
        </div>

        <div className="space-y-4">
          <Card className="border-slate-100">
            <CardContent className="space-y-4 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Order summary</h3>
              <div className="flex items-center justify-between text-sm text-slate-600"><span>Subtotal ({itemCount} items)</span><span>{formatMinor(subtotalMinor)}</span></div>
              {storedPromo && <div className="flex items-center justify-between text-sm text-slate-600"><span>Promo</span><span className="font-semibold uppercase">{storedPromo}</span></div>}
              <p className="text-xs text-slate-500">Delivery and any promo discount are confirmed at checkout.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardContent className="space-y-3 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Promo code</h3>
              <Input placeholder="Enter promo code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} />
              <div className="flex items-center gap-2">
                <Button className="bg-brand-green-dark text-white" onClick={applyPromo} disabled={cartEmpty || !promoCode.trim()}>Apply</Button>
                {storedPromo && <Button variant="outline" className="border-slate-200" onClick={() => { setPromoCode(""); writeStoredPromo(""); setStoredPromo(""); }}>Remove</Button>}
              </div>
            </CardContent>
          </Card>

          <Button asChild className="w-full bg-brand-olive text-brand-dark" disabled={cartEmpty || hasUnavailable}>
            <Link to="/checkout" aria-disabled={cartEmpty || hasUnavailable} onClick={(event) => { if (cartEmpty || hasUnavailable) event.preventDefault(); }}>
              {hasUnavailable ? "Remove unavailable items first" : "Proceed to checkout"}
            </Link>
          </Button>
        </div>
      </div>
    </ShopShell>
  );
}
