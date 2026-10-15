import Seo from "@/lib/seo/Seo";
import { BASE_URL, COMPANY_ADDRESS_TEXT, COMPANY_LEGAL_NAME, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, SUPPORT_HOURS_TEXT } from "@/lib/seo/constants";
import MarketingShell from "./MarketingShell";

/**
 * Delivery, payment, returns and refunds for the TwoPaws shop. The delivery table mirrors the supplier
 * shipping zones in Firestore (suppliers/{id}/shippingZones) as of October 2026; checkout always shows
 * the exact fee and ETA for the chosen address before an order is placed.
 */
const DELIVERY_ROWS = [
  { supplier: "PetYard", cairo: "EGP 50 · same day (60 min in select areas)", giza: "EGP 50 · same day (60 min in select areas)", coast: "EGP 200 · 1 to 3 days" },
  { supplier: "Zima Pets", cairo: "EGP 50 · same day", giza: "EGP 50 · 1 to 2 days", coast: "EGP 200 · 1 to 3 days" },
  { supplier: "Dogzone", cairo: "EGP 50 · same day", giza: "EGP 50 · 1 day", coast: "EGP 200 · 1 to 3 days" },
  { supplier: "Wags", cairo: "EGP 50 · within 24 hours", giza: "EGP 50 · within 24 hours", coast: "EGP 200 · 1 to 3 days" },
  { supplier: "7 Pets", cairo: "EGP 80 · 1 to 2 days", giza: "EGP 80 · 1 to 2 days", coast: "EGP 200 · 1 to 3 days" },
];

const FAQ = [
  { q: "Where do you deliver?", a: "Website orders deliver to Cairo and Giza. The TwoPaws app also delivers to the North Coast in season. Delivery fees and times depend on the supplier that fulfils your order and are shown at checkout before you pay." },
  { q: "How much does delivery cost?", a: "EGP 50 to EGP 80 per supplier in Cairo and Giza, and EGP 200 to the North Coast. If your order contains products from two suppliers, each supplier's delivery fee applies and the total is shown at checkout." },
  { q: "When will my order arrive?", a: "Most Cairo orders arrive the same day; Giza orders arrive within 1 to 2 days. Orders placed after 20:00 are dispatched the next morning. The estimate for your address is shown at checkout and in your order confirmation." },
  { q: "How can I pay?", a: "Cash on delivery, or by card and mobile wallet through Paymob, a licensed Egyptian payment provider. Card details are entered on Paymob's secure page and never stored by TwoPaws." },
  { q: "Can I return a product?", a: "Yes. You can return an unopened, unused product in its original packaging within 7 days of delivery. Pet food, treats, litter and medicines cannot be returned once opened, for hygiene and safety reasons, unless they are damaged or faulty." },
  { q: "What if my order arrives damaged, wrong or missing items?", a: "Tell us within 48 hours of delivery with a photo and your order number. We arrange a replacement or a full refund, including the delivery fee, at no cost to you." },
  { q: "How are refunds paid?", a: "Card and wallet payments are refunded to the original payment method within 5 to 14 business days depending on your bank. Cash-on-delivery orders are refunded by bank transfer or mobile wallet within 5 business days of the return being received." },
  { q: "Can I cancel an order?", a: "You can cancel from the Orders page or by contacting us any time before the supplier dispatches it. Card payments for cancelled orders are refunded in full." },
];

export default function ShippingReturnsPage() {
  const description = "Delivery areas, fees and times, payment methods, and the 7-day return and refund policy for orders on twopaws.pet in Cairo and Giza.";
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "MerchantReturnPolicy",
      "@id": `${BASE_URL}/shipping-and-returns/#returns`,
      applicableCountry: "EG",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      returnPolicyUrl: `${BASE_URL}/shipping-and-returns/`,
    },
  ];
  return (
    <MarketingShell>
      <Seo title="Shipping, Returns and Refunds | TwoPaws Shop Egypt" description={description} canonicalUrl="/shipping-and-returns/" structuredData={structuredData} />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">Shipping, returns and refunds</h1>
        <p className="text-lg text-slate-700">
          How orders from the TwoPaws shop are delivered, paid for, returned and refunded. Last updated 15 October 2026.
        </p>
      </header>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Who you are buying from</h2>
        <p>
          The TwoPaws shop is a marketplace operated by {COMPANY_LEGAL_NAME}, {COMPANY_ADDRESS_TEXT}. Products are sold and delivered by
          verified Egyptian pet suppliers (PetYard, Zima Pets, Dogzone, Wags and 7 Pets). The supplier for each product is shown on the product
          page and at checkout, and TwoPaws handles your order, payment and support.
        </p>
      </section>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Delivery areas, fees and times</h2>
        <p>
          Delivery is charged per supplier at the rates below and confirmed at checkout for your address. Prices on the site include VAT; there are
          no additional charges at the door.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-900">
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Cairo</th>
                <th className="py-2 pr-4">Giza</th>
                <th className="py-2">North Coast (app only)</th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_ROWS.map((row) => (
                <tr key={row.supplier} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900">{row.supplier}</td>
                  <td className="py-2 pr-4">{row.cairo}</td>
                  <td className="py-2 pr-4">{row.giza}</td>
                  <td className="py-2">{row.coast}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Orders placed before 20:00 are dispatched the same day where same-day delivery is offered; later orders go out the next morning. You
          receive an order number by email and can follow the order on your Orders page or in the app.
        </p>
      </section>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Payment</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Cash on delivery, paid to the courier in Egyptian pounds.</li>
          <li>Visa, Mastercard, Meeza and mobile wallets through Paymob. Payment is taken on Paymob's secure page; TwoPaws never sees or stores card numbers.</li>
          <li>All prices are in Egyptian pounds and include VAT. The total you see at checkout is the total you pay.</li>
        </ul>
      </section>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Returns</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>You may return any unopened, unused product in its original packaging within 7 days of delivery, free of charge. We collect it from your address.</li>
          <li>Opened pet food, treats, litter, supplements and medicines cannot be returned, for hygiene and animal-safety reasons, unless they are damaged, expired or faulty on arrival.</li>
          <li>Damaged, wrong, expired or missing items: report them within 48 hours of delivery with your order number and a photo. We replace the item or refund it in full, including delivery.</li>
          <li>To start a return, email {CONTACT_EMAIL} or use the Orders page in the app. We confirm the pickup within one business day.</li>
        </ul>
      </section>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Refunds and cancellations</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Refunds are issued once the returned item is received and checked, normally within 2 business days of pickup.</li>
          <li>Card and wallet payments are refunded to the original payment method. Banks take 5 to 14 business days to show the credit.</li>
          <li>Cash-on-delivery orders are refunded by bank transfer or mobile wallet within 5 business days.</li>
          <li>Orders can be cancelled free of charge until the supplier dispatches them, from the Orders page or by contacting us. Prepaid cancelled orders are refunded in full.</li>
        </ul>
      </section>

      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Questions</h2>
        <dl className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold text-slate-900">{item.q}</dt>
              <dd className="mt-1">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Contact</h2>
        <p>
          {COMPANY_LEGAL_NAME}, {COMPANY_ADDRESS_TEXT}. Email <a className="text-slate-900 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {CONTACT_PHONE ? <> or call <a className="text-slate-900 underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a></> : null}. Support hours: {SUPPORT_HOURS_TEXT}.
        </p>
      </section>
    </MarketingShell>
  );
}
