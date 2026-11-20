import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ClayProp from "@/components/motion/ClayProp";
import Reveal from "@/components/motion/Reveal";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import Seo from "@/lib/seo/Seo";
import { BASE_URL } from "@/lib/seo/constants";

const display = { fontFamily: '"Outfit", "Inter", system-ui, sans-serif' };
const shell = "mx-auto w-full max-w-[1500px] px-6 sm:px-12 lg:px-20";
const ease = [0.22, 1, 0.36, 1] as const;

/** True when entrance and looping animations should be skipped: reduced motion, or the prerender snapshot. */
function useStill() {
  return (useReducedMotion() ?? false) || isReactSnapPrerender();
}

/**
 * The campaign promises live here so they can be checked and changed in one place.
 * Everything on the page that commits TwoPaws to something reads from this object.
 */
const CAMPAIGN = {
  intro: "Write a letter from your pet this season. We read every one, and TwoPaws Claus will surprise some lucky pets.",
  giveBack: "Every letter helps TwoPaws support rescue pets in Egypt this season.",
  surprise: "TwoPaws Claus will pick some lucky pets and send them a surprise from the PawShop.",
  lettersPerPet: "One letter per pet, please, so every pet gets a turn.",
};

const steps = [
  {
    prop: "letter" as const,
    title: "Write your pet's letter",
    text: "Tell TwoPaws Claus what your pet is wishing for. It takes about a minute.",
  },
  { prop: "heart" as const, title: "Help a pet in need", text: CAMPAIGN.giveBack },
  { prop: "gift" as const, title: "Your pet might get a surprise", text: CAMPAIGN.surprise },
];

const faqs = [
  {
    question: "What is TwoPaws Claus?",
    answer: `TwoPaws Claus is our holiday letterbox for pets. ${CAMPAIGN.intro}`,
  },
  {
    question: "How do I send a letter?",
    answer:
      "Fill in the letter on this page with your pet's name and wish, add your name and an email or phone number, and press send. You'll get a reference number straight away.",
  },
  { question: "Is it free?", answer: "Yes. Writing to TwoPaws Claus is free, and you don't need to buy anything." },
  { question: "How does my letter help other pets?", answer: CAMPAIGN.giveBack },
  {
    question: "Will my pet get a gift?",
    answer: `${CAMPAIGN.surprise} If your pet is picked, we'll contact you on the email or phone number you gave us.`,
  },
  { question: "How many letters can I send?", answer: CAMPAIGN.lettersPerPet },
  {
    question: "What happens to my details?",
    answer:
      "We use your name and contact details only to reply about your pet's letter. See our privacy policy for how TwoPaws handles personal data.",
  },
];

const PET_TYPES = ["Dog", "Cat", "Other"] as const;
const MAX_WISH = 600;
const CONTACT_PATTERN = /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9][0-9 -]{6,18}[0-9])$/;

/**
 * Letters go through the same `submitSupportRequest` callable as the contact form, so they land in the
 * dashboard's Support inbox (topic "other", message tagged "[TwoPaws Claus letter]") with no backend change.
 * Firebase is imported only on submit, keeping this page as light as the other marketing pages.
 */
async function sendLetter(payload: Record<string, string>) {
  const [{ auth, functions }, { httpsCallable }] = await Promise.all([
    import("@/lib/firebase"),
    import("firebase/functions"),
  ]);
  await auth.authStateReady();
  const call = httpsCallable<Record<string, string>, { ok: boolean; ticketNumber: string }>(functions, "submitSupportRequest");
  return (await call(payload)).data;
}

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#783F6A]/20 bg-white px-4 py-3 text-base text-[#3d1f3a] placeholder:text-[#3d1f3a]/40 focus:border-[#783F6A] focus:outline-none focus:ring-2 focus:ring-[#783F6A]/25";

function FieldError({ id, text }: { id: string; text: string | null }) {
  return text ? (
    <p id={id} className="mt-1.5 text-sm text-[#B4232A]">
      {text}
    </p>
  ) : null;
}

function LetterForm() {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<(typeof PET_TYPES)[number] | null>(null);
  const [wish, setWish] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ ticketNumber: string; petName: string } | null>(null);

  const problems = {
    petName: petName.trim() ? null : "Tell us your pet's name.",
    petType: petType ? null : "Choose what kind of pet is writing.",
    wish: !wish.trim()
      ? "Write your pet's wish."
      : wish.length > MAX_WISH
        ? `Keep the wish under ${MAX_WISH} characters.`
        : null,
    name: name.trim() ? null : "Tell us your name.",
    contact: CONTACT_PATTERN.test(contact.trim()) ? null : "Add an email or phone number so we can reach you.",
  };
  const show = (key: keyof typeof problems) => (submitted ? problems[key] : null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (Object.values(problems).some(Boolean) || !petType) return;
    setSending(true);
    try {
      const result = await sendLetter({
        topic: "other",
        name: name.trim(),
        contact: contact.trim(),
        message: `[TwoPaws Claus letter]\nPet: ${petName.trim()} (${petType})\nWish: ${wish.trim()}`,
        source: "website",
        appVersion: "website",
        platform: "web",
      });
      setSent({ ticketNumber: result.ticketNumber, petName: petName.trim() });
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "";
      // Validation and rate-limit messages from the backend are written for customers; anything else is not.
      setError(
        text && !/internal|unavailable|network|failed to fetch/i.test(text)
          ? text
          : "Your letter couldn't be sent. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="relative flex flex-col items-start gap-4 py-6" role="status">
        <Confetti />
        <motion.img
          src="/clay/prop-gift.webp"
          alt=""
          className="h-24 w-auto"
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
        />
        <h3 style={display} className="text-3xl text-[#5E2A5A]">
          {sent.petName}&rsquo;s letter is on its way
        </h3>
        <p className="max-w-md text-[#3d1f3a]/75">
          TwoPaws Claus has it. Your reference is <span className="font-semibold text-[#3d1f3a]">#{sent.ticketNumber}</span>.
          If {sent.petName} is picked for a surprise, we&rsquo;ll get in touch.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setPetName("");
            setPetType(null);
            setWish("");
            setSubmitted(false);
          }}
          className="font-medium text-[#783F6A] underline underline-offset-4"
        >
          Write a letter for another pet
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <p style={display} className="text-2xl text-[#5E2A5A] sm:text-3xl">
        Dear TwoPaws Claus,
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#3d1f3a]">
          My name is
          <input
            className={fieldClass}
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Your pet's name"
            maxLength={60}
            aria-invalid={Boolean(show("petName"))}
            aria-describedby="claus-pet-name-error"
          />
          <FieldError id="claus-pet-name-error" text={show("petName")} />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-[#3d1f3a]">and I am a</legend>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-describedby="claus-pet-type-error">
            {PET_TYPES.map((type) => (
              <motion.button
                key={type}
                type="button"
                role="radio"
                aria-checked={petType === type}
                onClick={() => setPetType(type)}
                whileTap={{ scale: 0.92 }}
                className={`h-12 rounded-full border px-5 text-base transition-colors ${
                  petType === type
                    ? "border-[#783F6A] bg-[#783F6A] text-white"
                    : "border-[#783F6A]/25 bg-white text-[#3d1f3a] hover:border-[#783F6A]"
                }`}
              >
                {type}
              </motion.button>
            ))}
          </div>
          <FieldError id="claus-pet-type-error" text={show("petType")} />
        </fieldset>
      </div>

      <label className="block text-sm font-medium text-[#3d1f3a]">
        This year my wish is
        <textarea
          className={`${fieldClass} min-h-[150px] resize-y`}
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          placeholder="A squeaky toy that never stops squeaking, a sunny spot by the window..."
          aria-invalid={Boolean(show("wish"))}
          aria-describedby="claus-wish-error claus-wish-count"
        />
        <span className="mt-1.5 flex justify-between gap-4">
          <FieldError id="claus-wish-error" text={show("wish")} />
          <span id="claus-wish-count" className={`ml-auto text-sm ${wish.length > MAX_WISH ? "text-[#B4232A]" : "text-[#3d1f3a]/50"}`}>
            {wish.length}/{MAX_WISH}
          </span>
        </span>
      </label>

      <div className="grid gap-6 border-t border-[#783F6A]/15 pt-6 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#3d1f3a]">
          Written with help from
          <input
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            maxLength={80}
            aria-invalid={Boolean(show("name"))}
            aria-describedby="claus-name-error"
          />
          <FieldError id="claus-name-error" text={show("name")} />
        </label>
        <label className="block text-sm font-medium text-[#3d1f3a]">
          Email or phone
          <input
            className={fieldClass}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="So TwoPaws Claus can reach you"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            aria-invalid={Boolean(show("contact"))}
            aria-describedby="claus-contact-error"
          />
          <FieldError id="claus-contact-error" text={show("contact")} />
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C22]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <motion.button
          type="submit"
          disabled={sending}
          style={display}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="group inline-flex h-14 items-center gap-3 rounded-full bg-[#783F6A] px-8 text-[18px] font-medium text-white shadow-[0_8px_18px_-8px_rgba(94,42,90,0.7)] disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send my pet's letter"}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
        </motion.button>
        <p className="max-w-xs text-sm text-[#3d1f3a]/60">
          We use your details only to reply about this letter. See our{" "}
          <Link to="/privacy/" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

/** A highlighted word with a hand-drawn underline that draws itself when it scrolls into view. */
function Underlined({ children, color = "#FEC329" }: { children: ReactNode; color?: string }) {
  const still = useStill();
  return (
    <span className="relative inline-block" style={{ color }}>
      {children}
      <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.2em] w-full overflow-visible">
        <motion.path
          d="M2 8 C 22 2, 38 11, 58 6 S 96 3, 118 7"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={still ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: "some", margin: "0px 0px -15% 0px" }}
          transition={{ duration: 0.9, ease, delay: 0.35 }}
        />
      </svg>
    </span>
  );
}

/** Little four-point stars that twinkle in the hero sky. */
function Sparkles() {
  const spots = [
    [6, 16, 18], [18, 9, 12], [31, 20, 16], [44, 8, 14], [57, 17, 20], [69, 7, 12], [82, 15, 18], [93, 10, 14], [38, 30, 10], [76, 27, 12],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {spots.map(([left, top, size], i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="twinkle absolute text-white"
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${(i * 0.47) % 3}s` }}
        >
          <path fill="currentColor" d="M12 0c.9 6.6 4.5 10.2 12 12-7.5 1.8-11.1 5.400-12 12-.9-6.600-4.500-10.200-12-12 7.500-1.800 11.100-5.400 12-12Z" />
        </svg>
      ))}
    </div>
  );
}

/** A clay envelope that drifts across the hero towards the letterbox every few seconds. */
function FlyingLetter() {
  const still = useStill();
  if (still) return null;
  return (
    <motion.img
      aria-hidden
      src="/clay/prop-letter.webp"
      alt=""
      className="pointer-events-none absolute left-0 top-0 hidden w-16 drop-shadow-[0_14px_12px_rgba(94,42,90,0.25)] md:block lg:w-20"
      initial={{ x: "34vw", y: "10vh", rotate: -14, opacity: 0 }}
      animate={{
        x: ["34vw", "48vw", "63vw", "79vw", "88vw"],   // stays right of the headline
        y: ["10vh", "20vh", "14vh", "32vh", "52vh"],
        rotate: [-14, 6, -8, 10, 0],
        opacity: [0, 1, 1, 1, 0],
        scale: [1, 1, 0.95, 0.8, 0.45],
      }}
      transition={{ duration: 7, ease: "easeInOut", repeat: Infinity, repeatDelay: 5, delay: 2.2 }}
    />
  );
}

/** The hero headline: words drop in one after another, and "Claus" lands with a wobble. */
function HeroHeadline() {
  const still = useStill();
  const words = ["Send", "your", "pet\u2019s", "wish", "to", "TwoPaws"];
  const start = 0.2;
  return (
    <h1
      style={display}
      className="mt-4 max-w-[12ch] text-[clamp(2.5rem,5.4vw,5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-[#5E2A5A]"
    >
      {words.map((word, i) => (
        <span key={word}>
          <motion.span
            className="inline-block"
            initial={still ? false : { opacity: 0, y: 34, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, ease, delay: start + i * 0.08 }}
          >
            {word}
          </motion.span>{" "}
        </span>
      ))}
      <motion.span
        className="inline-block origin-bottom-left text-[#E5484D]"
        initial={still ? false : { opacity: 0, y: 34, scale: 0.6 }}
        animate={still ? undefined : { opacity: 1, y: 0, scale: 1, rotate: [0, -7, 5, -3, 0] }}
        transition={{ duration: 1.1, ease, delay: start + words.length * 0.08 }}
      >
        Claus
      </motion.span>
    </h1>
  );
}

/** Coloured clay dots that burst outwards when a letter is sent. */
function Confetti() {
  const still = useStill();
  if (still) return null;
  const colors = ["#783F6A", "#FEC329", "#DF93C0", "#E5484D"];
  return (
    <span aria-hidden className="pointer-events-none absolute left-12 top-12">
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const distance = 70 + (i % 4) * 22;
        return (
          <motion.span
            key={i}
            className="absolute block rounded-full"
            style={{ width: 8 + (i % 3) * 3, height: 8 + (i % 3) * 3, background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 30, opacity: 0, scale: 1 }}
            transition={{ duration: 1.1 + (i % 3) * 0.15, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

/** Falling snow over the hero. Positions are derived from the index so the server-rendered HTML matches. */
function Snow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 34 }, (_, i) => {
        const size = 4 + ((i * 7) % 6);
        return (
          <span
            key={i}
            className="snowflake"
            style={{
              left: `${(i * 37) % 100}%`,
              width: size,
              height: size,
              opacity: 0.55 + ((i * 13) % 40) / 100,
              animationDuration: `${8 + ((i * 5) % 9)}s`,
              animationDelay: `${-((i * 3) % 14)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ClausPage() {
  const still = useStill();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroProgress, [0, 1], ["0%", "14%"]);
  const heroScale = useTransform(heroProgress, [0, 1], [1.04, 1.16]);
  const textY = useTransform(heroProgress, [0, 1], [0, -90]);
  const { scrollYProgress: pageProgress } = useScroll();
  const bar = useSpring(pageProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TwoPaws Claus",
    url: `${BASE_URL}/claus/`,
    description: CAMPAIGN.intro,
    publisher: { "@id": `${BASE_URL}/#organization` },
  };

  return (
    <div className="clay-bg text-[#3d1f3a]">
      {/* reading progress, in candy-cane colours */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left"
        style={{ scaleX: bar, background: "linear-gradient(90deg, #E5484D, #FEC329, #783F6A)" }}
      />
      <Seo
        title="TwoPaws Claus | Send your pet's holiday wish"
        description={`Write a letter from your pet to TwoPaws Claus. ${CAMPAIGN.giveBack}`}
        canonicalUrl="/claus/"
        structuredData={[pageSchema, faqSchema]}
      />

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-[620px] overflow-hidden md:h-[88svh]" style={{ background: "linear-gradient(#8CCBF3, #F2F8FF)" }}>
        <motion.img
          src="/clay/claus-hero.webp"
          alt="A snowy park with a decorated tree, a cabin strung with lights, a cat, a dog in a red hat, presents and a letterbox"
          width={2769}
          height={1200}
          {...{ fetchpriority: "high" }}
          className="absolute inset-x-0 bottom-0 h-[52%] w-full origin-bottom select-none object-cover object-[70%_100%] [mask-image:linear-gradient(to_bottom,transparent,black_26%)] md:inset-0 md:h-full md:[mask-image:none]"
          draggable={false}
          style={still ? undefined : { y: heroY, scale: heroScale }}
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease }}
        />
        {/* soft light behind the headline so it stays readable over the trees */}
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block"
          style={{ background: "radial-gradient(60% 75% at 18% 46%, rgba(255,255,255,0.92), rgba(255,255,255,0.55) 45%, transparent 72%)" }}
        />
        <Sparkles />
        <FlyingLetter />
        <Snow />
        <SiteHeader variant="overlay" />

        <motion.div className={`${shell} relative z-10 pb-[60%] pt-28 md:pb-0 md:pt-[15svh]`} style={still ? undefined : { y: textY }}>
          <motion.p
            style={display}
            className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-1.5 text-sm font-medium uppercase tracking-[0.14em] text-[#783F6A] shadow-sm"
            initial={still ? false : { opacity: 0, scale: 0.7, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#E5484D] opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E5484D]" />
            </span>
            TwoPaws Claus
          </motion.p>
          <HeroHeadline />
          <motion.p
            style={display}
            className="mt-5 max-w-[30rem] text-[clamp(1.05rem,1.6vw,1.45rem)] leading-[1.4] text-[#6B3566]"
            initial={still ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.95 }}
          >
            {CAMPAIGN.intro}
          </motion.p>
          <motion.a
            href="#letter"
            style={display}
            className="group mt-7 inline-flex h-14 items-center gap-3 rounded-full bg-[#783F6A] px-8 text-[18px] font-medium text-white shadow-[0_8px_18px_-8px_rgba(94,42,90,0.7)]"
            initial={still ? false : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 1.15 }}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Start your pet&rsquo;s letter
            <motion.span
              className="inline-flex"
              animate={still ? undefined : { x: [0, 6, 0] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </motion.span>
          </motion.a>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className={shell}>
          <Reveal fade={false}>
            <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]/80">How it works</p>
            <h2 style={display} className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.05] text-[#5E2A5A]">
              Three small steps, one big <Underlined>wish</Underlined>
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
            {/* dashed trail joining the three steps; it draws itself left to right */}
            <motion.span
              aria-hidden
              className="absolute left-[12%] right-[12%] top-[5.2rem] hidden origin-left border-t-[3px] border-dashed border-[#783F6A]/30 md:block"
              initial={still ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: "some", margin: "0px 0px -20% 0px" }}
              transition={{ duration: 1.4, ease, delay: 0.3 }}
            />
            {steps.map((step, i) => (
              // the wrapper carries the motion; .clay-card has its own scroll-driven transform
              <motion.li
                key={step.title}
                className="group relative"
                initial={still ? false : { opacity: 0, y: 50, rotate: i === 1 ? 0 : i === 0 ? -3 : 3 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: "some", margin: "0px 0px -12% 0px" }}
                transition={{ type: "spring", stiffness: 120, damping: 14, delay: i * 0.16 }}
                whileHover={{ y: -8 }}
              >
                <div className="clay-card flex h-full flex-col p-7 sm:p-8">
                  <motion.img
                    src={`/clay/prop-${step.prop}.webp`}
                    alt=""
                    loading="lazy"
                    className="h-28 w-auto self-start object-contain transition-transform duration-300 group-hover:scale-110"
                    animate={still ? undefined : { y: [0, -9, 0], rotate: [0, i % 2 ? -4 : 4, 0] }}
                    transition={{ duration: 3.6 + i * 0.5, ease: "easeInOut", repeat: Infinity, delay: i * 0.4 }}
                  />
                  <motion.p
                    className="mt-6 inline-flex h-8 w-8 items-center justify-center self-start rounded-full bg-[#783F6A] text-sm font-semibold tabular-nums text-white"
                    initial={still ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.35 + i * 0.16 }}
                  >
                    {i + 1}
                  </motion.p>
                  <h3 style={display} className="mt-3 text-2xl text-[#3d1f3a]">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-[#3d1f3a]/75">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* THE LETTER */}
      <section id="letter" className="relative scroll-mt-20 overflow-hidden bg-[#FEC329] py-20 sm:py-28">
        <ClayProp name="letter" className="left-[3%] top-10 hidden w-28 lg:block xl:w-36" tilt={-12} />
        <ClayProp name="gift" className="bottom-12 right-[3%] hidden w-28 lg:block xl:w-36" tilt={8} />
        <motion.div
          className="mx-auto w-full max-w-3xl px-5 sm:px-8"
          initial={still ? false : { opacity: 0, y: 90, rotate: -4 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: "some", margin: "0px 0px -18% 0px" }}
          transition={{ type: "spring", stiffness: 70, damping: 14 }}
        >
          {/* airmail edging in the brand colours; the stripes travel slowly around the letter */}
          <div className="airmail rounded-[2.2rem] p-2.5 shadow-[0_30px_50px_-25px_rgba(94,42,90,0.55)]">
            <div className="rounded-[1.7rem] bg-white p-6 sm:p-10">
              <LetterForm />
            </div>
          </div>
        </motion.div>
      </section>

      {/* MORE WAYS TO HELP */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <ClayProp name="bone" className="right-[5%] top-10 hidden w-24 md:block lg:w-28" tilt={-10} />
        <div className={shell}>
          <Reveal fade={false}>
            <h2 style={display} className="text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.05] text-[#5E2A5A]">
              More ways to spread the <Underlined>joy</Underlined>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal variant="left" fade={false}>
            <Link to="/shop/" className="clay-card group flex h-full items-center gap-6 p-7 transition-transform duration-300 hover:-translate-y-1.5 sm:p-8">
              <img src="/clay/prop-bowl.webp" alt="" loading="lazy" className="h-20 w-auto shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <span>
                <span style={display} className="block text-2xl text-[#3d1f3a]">
                  Fill their stocking
                </span>
                <span className="mt-1 block text-[#3d1f3a]/75">Food, treats and toys from the PawShop, delivered to your door.</span>
                <span className="mt-3 inline-flex items-center gap-2 font-medium text-[#783F6A]">
                  Visit the shop <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
            </Reveal>
            <Reveal variant="right" fade={false} delay={0.1}>
            <a href="/download/" className="clay-card group flex h-full items-center gap-6 p-7 transition-transform duration-300 hover:-translate-y-1.5 sm:p-8">
              <img src="/clay/prop-paw.webp" alt="" loading="lazy" className="h-20 w-auto shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span>
                <span style={display} className="block text-2xl text-[#3d1f3a]">
                  Give a pet a home
                </span>
                <span className="mt-1 block text-[#3d1f3a]/75">Browse adoption offers in the TwoPaws app and meet a pet who is waiting.</span>
                <span className="mt-3 inline-flex items-center gap-2 font-medium text-[#783F6A]">
                  Get the app <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 sm:pb-32">
        <div className={`${shell} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16`}>
          <Reveal variant="left" fade={false}>
            <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]/80">Questions</p>
            <h2 style={display} className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.05] text-[#5E2A5A]">
              Good to know
            </h2>
          </Reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <Reveal key={faq.question} variant="right" fade={false} delay={Math.min(i, 5) * 0.07}>
              <AccordionItem value={`faq-${i}`} className="border-[#783F6A]/20">
                <AccordionTrigger style={display} className="py-5 text-left text-xl font-normal text-[#3d1f3a] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-xl pb-5 text-[15px] leading-[1.75] text-[#3d1f3a]/75">{faq.answer}</AccordionContent>
              </AccordionItem>
              </Reveal>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
