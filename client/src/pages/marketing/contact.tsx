import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import Seo from "@/lib/seo/Seo";
import { trackMetaEvent } from "@/lib/metaPixel";
import {
  BASE_URL,
  COMPANY_ADDRESS,
  COMPANY_ADDRESS_TEXT,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  SUPPORT_HOURS_TEXT,
} from "@/lib/seo/constants";
import MarketingShell from "./MarketingShell";

const display = { fontFamily: '"Outfit", "Inter", system-ui, sans-serif' };

/** Topic keys match SUPPORT_TOPICS in the backend's support/tickets.ts; "partner" is website-only. */
const TOPICS = [
  { key: "order", label: "Order or delivery" },
  { key: "booking", label: "Vet or hotel booking" },
  { key: "payment", label: "Payment or refund" },
  { key: "account", label: "My account" },
  { key: "pet_records", label: "Pet records" },
  { key: "partner", label: "Partnership" },
  { key: "other", label: "Something else" },
] as const;
type TopicKey = (typeof TOPICS)[number]["key"];

const MAX_MESSAGE = 4000;
const CONTACT_PATTERN = /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9][0-9 -]{6,18}[0-9])$/;
const WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE.replace(/\D/g, "")}`;

const isTopic = (value: string | null): value is TopicKey => TOPICS.some((topic) => topic.key === value);

type Sent = { ticketNumber: string; contact: string };

/**
 * Sends the form through the same `submitSupportRequest` callable as the app's Support page, so it
 * lands in the dashboard's Support inbox. Firebase is imported only on submit, keeping this page as
 * light as the other marketing pages. A signed-in visitor's ticket is linked to their account.
 */
async function submitSupportRequest(payload: Record<string, string>) {
  const [{ auth, functions }, { httpsCallable }] = await Promise.all([
    import("@/lib/firebase"),
    import("firebase/functions"),
  ]);
  await auth.authStateReady();
  const call = httpsCallable<Record<string, string>, { ok: boolean; ticketNumber: string }>(functions, "submitSupportRequest");
  const result = await call(payload);
  return result.data;
}

function ContactCard({ href, icon, title, detail, note, external }: {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
  note: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="clay-card group flex items-start gap-4 p-6 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#783F6A]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#783F6A] text-white">{icon}</span>
      <span className="min-w-0">
        <span style={display} className="block text-xl text-[#3d1f3a]">{title}</span>
        <span className="mt-0.5 block font-medium text-[#783F6A] [overflow-wrap:anywhere]">{detail}</span>
        <span className="mt-1 block text-sm text-[#3d1f3a]/65">{note}</span>
      </span>
    </a>
  );
}

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#783F6A]/20 bg-white px-4 py-3 text-base text-[#3d1f3a] placeholder:text-[#3d1f3a]/40 focus:border-[#783F6A] focus:outline-none focus:ring-2 focus:ring-[#783F6A]/25";

function ContactForm({ initialTopic }: { initialTopic: TopicKey | null }) {
  const [topic, setTopic] = useState<TopicKey | null>(initialTopic);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  const problems = {
    topic: topic ? null : "Choose what your message is about.",
    name: name.trim() ? null : "Tell us your name.",
    contact: CONTACT_PATTERN.test(contact.trim()) ? null : "Add an email or phone number so we can reply.",
    message: !message.trim()
      ? "Tell us what you need help with."
      : message.length > MAX_MESSAGE
        ? `Keep your message under ${MAX_MESSAGE} characters.`
        : null,
  };
  const show = (key: keyof typeof problems) => (submitted ? problems[key] : null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (Object.values(problems).some(Boolean) || !topic) return;
    setSending(true);
    try {
      const result = await submitSupportRequest({
        topic,
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
        source: "website",
        appVersion: "website",
        platform: "web",
      });
      trackMetaEvent("Contact", { contact_method: "form", topic, source_path: "/contact" });
      setSent({ ticketNumber: result.ticketNumber, contact: contact.trim() });
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "";
      // Validation and rate-limit messages from the backend are written for customers; anything else is not.
      setError(text && !/internal|unavailable|network|failed to fetch/i.test(text)
        ? text
        : "Your message couldn't be sent. Check your connection and try again, or reach us on WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4 py-4" role="status">
        <CheckCircle2 className="h-10 w-10 text-[#783F6A]" />
        <h3 style={display} className="text-2xl text-[#3d1f3a]">Thanks, we&rsquo;ve got your message</h3>
        <p className="text-[#3d1f3a]/75">
          Your reference is <span className="font-semibold text-[#3d1f3a]">#{sent.ticketNumber}</span>. We reply on{" "}
          <span className="font-semibold text-[#3d1f3a] [overflow-wrap:anywhere]">{sent.contact}</span>, usually within one business day.
        </p>
        <button
          type="button"
          onClick={() => { setSent(null); setMessage(""); setSubmitted(false); }}
          className="text-sm font-semibold text-[#783F6A] underline-offset-2 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-[#3d1f3a]">What is it about?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((item) => {
            const selected = topic === item.key;
            return (
              <label
                key={item.key}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#783F6A]/40 ${
                  selected
                    ? "border-[#783F6A] bg-[#783F6A] text-white"
                    : "border-[#783F6A]/25 bg-white text-[#3d1f3a] hover:border-[#783F6A]/60"
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={item.key}
                  checked={selected}
                  onChange={() => setTopic(item.key)}
                  className="sr-only"
                />
                {item.label}
              </label>
            );
          })}
        </div>
        {show("topic") ? <p className="mt-2 text-sm text-red-700">{show("topic")}</p> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-semibold text-[#3d1f3a]">Your name</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(show("name"))}
            aria-describedby={show("name") ? "contact-name-error" : undefined}
            className={fieldClass}
          />
          {show("name") ? <p id="contact-name-error" className="mt-1.5 text-sm text-red-700">{show("name")}</p> : null}
        </div>
        <div>
          <label htmlFor="contact-reply" className="text-sm font-semibold text-[#3d1f3a]">Email or phone</label>
          <input
            id="contact-reply"
            name="contact"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com or 01xxxxxxxxx"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            aria-invalid={Boolean(show("contact"))}
            aria-describedby={show("contact") ? "contact-reply-error" : "contact-reply-hint"}
            className={fieldClass}
          />
          {show("contact") ? (
            <p id="contact-reply-error" className="mt-1.5 text-sm text-red-700">{show("contact")}</p>
          ) : (
            <p id="contact-reply-hint" className="mt-1.5 text-xs text-[#3d1f3a]/55">We&rsquo;ll reply here.</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="text-sm font-semibold text-[#3d1f3a]">Message</label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={topic === "order" ? "Include your order number if you have it." : topic === "partner" ? "Tell us about your clinic, hotel, shelter or store." : "How can we help?"}
          aria-invalid={Boolean(show("message"))}
          aria-describedby="contact-message-count"
          className={`${fieldClass} resize-y`}
        />
        <div className="mt-1.5 flex justify-between gap-3 text-xs">
          <span className="text-red-700">{show("message")}</span>
          <span id="contact-message-count" className={message.length > MAX_MESSAGE ? "text-red-700" : "text-[#3d1f3a]/50"}>
            {message.length}/{MAX_MESSAGE}
          </span>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          style={display}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#783F6A] px-7 text-[16px] font-medium text-white transition-colors hover:bg-[#6a365d] disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send message"}
          {sending ? null : <ArrowRight className="h-4 w-4" />}
        </button>
        <p className="text-xs text-[#3d1f3a]/55">
          By sending, you agree we use these details to reply, as described in our{" "}
          <Link to="/privacy/" className="underline">privacy policy</Link>.
        </p>
      </div>
    </form>
  );
}

const HELP_LINKS = [
  { title: "Track or change an order", text: "See your orders and their delivery status.", href: "/orders" },
  { title: "Returns and refunds", text: "7-day returns on unopened items, and how refunds work.", href: "/shipping-and-returns/" },
  { title: "Delete your account", text: "Ask us to delete your account and its data.", href: "/delete-account/" },
];

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get("topic");
  const formRef = useRef<HTMLElement>(null);
  const [topicFromLink, setTopicFromLink] = useState<TopicKey | null>(isTopic(topicParam) ? topicParam : null);

  const startPartnerMessage = () => {
    setTopicFromLink("partner");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MarketingShell>
      <Seo
        title="Contact TwoPaws | Pet care in Egypt"
        description="Contact TwoPaws on WhatsApp, by phone or email, or send us a message about an order, a booking, your account or a partnership."
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
        <h1 style={display} className="text-[#3d1f3a]">How can we help?</h1>
        <p className="max-w-2xl text-lg text-[#3d1f3a]/75">
          Message us, call, or send the form below. We&rsquo;re here {SUPPORT_HOURS_TEXT.replace(" Cairo time", "")} (Cairo time) and
          reply to most messages within one business day.
        </p>
      </header>

      <section aria-label="Ways to reach us" className="grid gap-4 md:grid-cols-3">
        <ContactCard
          href={WHATSAPP_URL}
          external
          icon={<FaWhatsapp className="h-6 w-6" />}
          title="WhatsApp"
          detail={CONTACT_PHONE_DISPLAY}
          note="Fastest for orders and bookings"
        />
        <ContactCard
          href={`tel:${CONTACT_PHONE}`}
          icon={<Phone className="h-5 w-5" />}
          title="Call us"
          detail={CONTACT_PHONE_DISPLAY}
          note="During support hours"
        />
        <ContactCard
          href={`mailto:${CONTACT_EMAIL}`}
          icon={<Mail className="h-5 w-5" />}
          title="Email"
          detail={CONTACT_EMAIL}
          note="For anything, any time"
        />
      </section>

      <section ref={formRef} id="message" className="clay-card scroll-mt-24 p-6 sm:p-9">
        <h2 style={display} className="text-2xl text-[#3d1f3a] sm:text-3xl">Send us a message</h2>
        <p className="mt-2 text-[#3d1f3a]/70">It goes straight to our support team, the same as the Support page in the app.</p>
        <div className="mt-7">
          <ContactForm initialTopic={topicFromLink} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 style={display} className="text-2xl text-[#3d1f3a]">You might find it faster here</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {HELP_LINKS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="clay-card group flex items-center justify-between gap-4 p-5 transition-transform hover:-translate-y-0.5"
            >
              <span>
                <span className="block font-semibold text-[#3d1f3a]">{item.title}</span>
                <span className="mt-0.5 block text-sm text-[#3d1f3a]/65">{item.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#783F6A] transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
          <button
            type="button"
            onClick={startPartnerMessage}
            className="clay-card group flex items-center justify-between gap-4 p-5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span>
              <span className="block font-semibold text-[#3d1f3a]">Partner with TwoPaws</span>
              <span className="mt-0.5 block text-sm text-[#3d1f3a]/65">Clinics, hotels, shelters and suppliers who want to join.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#783F6A] transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      <section className="clay-card p-6 text-sm text-[#3d1f3a]/75 sm:p-7">
        <h2 className="text-base font-semibold text-[#3d1f3a]">Company details</h2>
        <address className="mt-2 not-italic leading-relaxed">
          <span className="font-semibold text-[#3d1f3a]">{COMPANY_LEGAL_NAME}</span>
          <br />
          {COMPANY_ADDRESS_TEXT}
        </address>
        <p className="mt-3">
          Operator of the TwoPaws app and the TwoPaws shop at twopaws.pet. Shop orders are fulfilled by verified Egyptian pet
          suppliers. See our <Link className="underline" to="/shipping-and-returns/">shipping, returns and refunds policy</Link>,{" "}
          <Link className="underline" to="/terms/">terms</Link> and <Link className="underline" to="/privacy/">privacy policy</Link>.
        </p>
      </section>
    </MarketingShell>
  );
}
