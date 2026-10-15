import Seo from "@/lib/seo/Seo";
import { BASE_URL, COMPANY_ADDRESS, COMPANY_ADDRESS_TEXT, COMPANY_LEGAL_NAME, CONTACT_EMAIL, CONTACT_PHONE, SUPPORT_HOURS_TEXT } from "@/lib/seo/constants";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

export default function ContactPage() {
  return (
    <MarketingShell>
      <Seo
        title="Contact TwoPaws | Pet care in Egypt"
        description="Contact the TwoPaws team for pet care questions in Egypt, app feedback, or partnership requests."
        canonicalUrl="/contact/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact TwoPaws",
          url: `${BASE_URL}/contact/`,
          mainEntity: {
            "@type": "Organization",
            name: "TwoPaws",
            legalName: COMPANY_LEGAL_NAME,
            url: BASE_URL,
            email: CONTACT_EMAIL,
            ...(CONTACT_PHONE ? { telephone: CONTACT_PHONE } : {}),
            address: { "@type": "PostalAddress", ...COMPANY_ADDRESS },
          },
        }}
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">Contact TwoPaws</h1>
        <p className="text-lg text-slate-700">
          We would love to hear from pet parents, clinics, and partners in Egypt.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Get in touch</h2>
        <p>
          Email us at{" "}
          <a className="text-slate-900 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          {" "}for support, partnerships, or media inquiries.
        </p>
        {CONTACT_PHONE ? (
          <p>
            Call or WhatsApp <a className="text-slate-900 underline" href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a> during support hours.
          </p>
        ) : null}
        <p>
          Support hours: {SUPPORT_HOURS_TEXT}. We respond to most requests within one business day and
          appreciate any feedback that helps TwoPaws serve Egypt better.
        </p>
      </section>
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Company details</h2>
        <address className="not-italic">
          <p className="font-semibold text-slate-900">{COMPANY_LEGAL_NAME}</p>
          <p>{COMPANY_ADDRESS_TEXT}</p>
          <p>Email: <a className="text-slate-900 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </address>
        <p>
          Operator of the TwoPaws app and the TwoPaws shop at twopaws.pet. Shop orders are fulfilled by
          verified Egyptian pet suppliers; see our{" "}
          <a className="text-slate-900 underline" href="/shipping-and-returns/">shipping, returns and refunds policy</a>,{" "}
          <a className="text-slate-900 underline" href="/terms/">terms</a> and{" "}
          <a className="text-slate-900 underline" href="/privacy/">privacy policy</a>.
        </p>
      </section>
    </MarketingShell>
  );
}