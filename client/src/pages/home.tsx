import ClayProp from "@/components/motion/ClayProp";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FaApple } from "react-icons/fa";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Seo from "@/lib/seo/Seo";
import { Helmet } from "react-helmet-async";
import Reveal from "@/components/motion/Reveal";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import {
  ANDROID_STORE_URL,
  BASE_URL,
  COMPANY_ADDRESS,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
  LINKEDIN_URL,
  TIKTOK_URL,
} from "@/lib/seo/constants";

const display = { fontFamily: '"Outfit", "Inter", system-ui, sans-serif' };
const ease = [0.22, 1, 0.36, 1] as const;

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

type SceneVariant = "home" | "care" | "shop" | "stay";

/** Layout of the park strips, in the world units used by blender/park_panorama.py. Keep the two in sync. */
const PARK = { viewH: 13, fgW: 93, bgW: 93 * 0.62, stops: [18.3, 40.3, 62.3, 84.3] };

/** One continuous park. Scrolling pans across it, pausing with each stop's building on the right, clear of the text. */
function Panorama({ progress, px }: { progress: MotionValue<number>; px: MotionValue<number> }) {
  const bandRef = useRef<HTMLDivElement>(null);
  const w = useMotionValue(1440);
  const h = useMotionValue(810);
  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const measure = () => {
      w.set(el.clientWidth);
      h.set(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const pan = (stripUnits: number, pointer: number) =>
    ([p, m, width, height]: number[]) => {
      const stripPx = (height * stripUnits) / PARK.viewH;
      const anchor = width >= 768 ? 0.78 : 0.5; // on desktop the building sits right of the text
      const t = Math.min(1, Math.max(0, p)) * (PARK.stops.length - 1);
      const i = Math.min(PARK.stops.length - 2, Math.floor(t));
      const local = t - i;
      const eased = local * local * (3 - 2 * local); // linger at each stop
      const stop = PARK.stops[i] + (PARK.stops[i + 1] - PARK.stops[i]) * eased;
      const x = anchor * width - (stop / PARK.fgW) * stripPx - m * pointer;
      return Math.max(width - stripPx, Math.min(0, x));
    };
  const bgX = useTransform([progress, px, w, h], pan(PARK.bgW, 6));
  const fgX = useTransform([progress, px, w, h], pan(PARK.fgW, 16));
  const strip = "absolute left-0 top-0 h-full w-auto max-w-none select-none will-change-transform";

  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(#7CC4F2, #BDE2FA)" }}>
      <div
        ref={bandRef}
        className="absolute inset-x-0 bottom-0 h-[56%] [mask-image:linear-gradient(to_bottom,transparent,black_30%)] md:inset-0 md:h-full md:[mask-image:none]"
      >
        <motion.img src="/clay/park-bg.webp" alt="" draggable={false} decoding="async" className={strip} style={{ x: bgX }} />
        <motion.img
          src="/clay/park-fg.webp"
          alt="A bright park with a cabin, a vet clinic, a market stall and a pet hotel, with dogs and cats beside each"
          draggable={false}
          decoding="async"
          className={strip}
          style={{ x: fgX }}
        />
      </div>
    </div>
  );
}

type Chapter = {
  variant: SceneVariant;
  dark: boolean;
  label: string;
  /** Line one, the start of line two, and the closing words shown in yellow. */
  title: [string, string, string];
  body: string;
  link: { label: string; href: string };
  /** App screenshot shown in the phone at this stop, with a description for screen readers. */
  screenshot: string;
  screenAlt: string;
};

const chapters: Chapter[] = [
  {
    variant: "home",
    dark: true,
    label: "Pet care in Egypt",
    title: ["Everything", "your pet", "needs"],
    body: "Vets, supplies, pet hotels, adoption and lost & found, gathered in one easy app.",
    link: { label: "Get the app", href: "/download" },
    screenshot: "/clay/screens/home.webp",
    screenAlt: "TwoPaws home screen with your pets, today's tasks and shop offers",
  },
  {
    variant: "care",
    dark: true,
    label: "01 — Care",
    title: ["A vet, whenever", "you need", "one"],
    body: "Ask the AI vet a question, book a clinic visit in a few taps, and keep every vaccine and record in one health tracker.",
    link: { label: "See how care works", href: "/features" },
    screenshot: "/clay/screens/care.webp",
    screenAlt: "TwoPaws AI Vet screen asking how it can help your pet",
  },
  {
    variant: "shop",
    dark: true,
    label: "02 — Shop",
    title: ["Food and supplies,", "to your", "door"],
    body: "Browse PawShop for food, litter, toys and care from trusted Egyptian suppliers, delivered to your door.",
    link: { label: "Visit the shop", href: "/shop" },
    screenshot: "/clay/screens/shop.webp",
    screenAlt: "TwoPaws shop screen with search, categories and offers",
  },
  {
    variant: "stay",
    dark: true,
    label: "03 — Stay & community",
    title: ["A place to stay,", "friends to", "meet"],
    body: "Book a pet hotel or daycare when you travel, adopt a pet, find a match on PawSwiper, and help lost pets get home.",
    link: { label: "See every feature", href: "/features" },
    screenshot: "/clay/screens/stay.webp",
    screenAlt: "TwoPaws PawSwiper screen showing a dog profile with Pass and Like buttons",
  },
];

/** The phone that stays on screen; its screen cross-fades as the chapter changes. */
function Phone({ active, progress }: { active: number; progress: MotionValue<number> }) {
  const reducedMotion = useReducedMotion() ?? false;
  // turns towards the reader and lifts slightly while travelling between stops, then settles
  const stops = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
  const rotateY = useTransform(progress, stops, [13, 4, 13, 4, 13, 4, 13]);
  const y = useTransform(progress, stops, [0, -18, 0, -18, 0, -18, 0]);
  return (
    <div className="[perspective:1800px]">
      <motion.div
        className="relative aspect-[9/19.3] h-[38svh] shrink-0 rounded-[1.7rem] bg-gradient-to-br from-[#4a4a50] via-[#1d1d21] to-[#0c0c0e] p-[6px] md:h-[min(75svh,660px)] md:rounded-[3.2rem] md:p-[11px]"
        style={{
          rotateY: reducedMotion ? 13 : rotateY,
          rotateX: 3,
          rotateZ: 2,
          y: reducedMotion ? 0 : y,
          boxShadow:
            "-3px 0 0 #2b2b30, -6px 1px 0 #1c1c20, -9px 2px 0 #121215, -26px 40px 60px -20px rgba(70,30,70,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.18)",
        }}
      >
        {/* side buttons */}
        <span aria-hidden className="absolute -left-[11px] top-[17%] h-[4%] w-[4px] rounded-l bg-[#2b2b30]" />
        <span aria-hidden className="absolute -left-[11px] top-[25%] h-[8%] w-[4px] rounded-l bg-[#2b2b30]" />
        <span aria-hidden className="absolute -left-[11px] top-[35%] h-[8%] w-[4px] rounded-l bg-[#2b2b30]" />
        <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-[#FAFAFA] md:rounded-[2.55rem]">
          {chapters.map((c, i) => (
            <div
              key={c.variant}
              aria-hidden={i !== active}
              className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
            >
              <img
                src={c.screenshot}
                alt={c.screenAlt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-cover object-top"
              />
            </div>
          ))}
          {/* camera cut-out */}
          <div aria-hidden className="absolute left-1/2 top-[1.5%] h-[3%] w-[29%] -translate-x-1/2 rounded-full bg-[#0c0c0e]" />
        </div>
      </motion.div>
    </div>
  );
}

function GooglePlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3.6 2.3 13.5 12 3.6 21.7a1.5 1.5 0 0 1-.6-1.2v-17c0-.5.2-.9.6-1.2Z" fill="#32BBFF" />
      <path d="m16.8 8.7-3.3 3.3-9.9-9.7c.5-.4 1.2-.4 1.9 0l11.3 6.4Z" fill="#00F076" />
      <path d="m16.8 15.3-11.3 6.4c-.7.4-1.4.4-1.9 0l9.9-9.7 3.3 3.3Z" fill="#FF3A44" />
      <path d="m20.4 13.3-3.6 2-3.3-3.3 3.3-3.3 3.6 2c1 .6 1 2 0 2.6Z" fill="#FFD500" />
    </svg>
  );
}

function StoreButton({ href, label, icon, tabIndex }: { href: string; label: string; icon: ReactNode; tabIndex?: number }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      tabIndex={tabIndex}
      style={display}
      className="inline-flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-[#3d1f3a] bg-white px-5 text-[16px] font-medium text-[#1f1320] transition-transform hover:-translate-y-0.5 md:h-14 md:px-6 md:text-[17px]"
    >
      {icon}
      {label}
    </a>
  );
}

/** Pinned stage: the phone stays put while scrolling swaps its screen, the scene behind it and the copy. */
function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const px = useSpring(useMotionValue(0), { stiffness: 50, damping: 16 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.0005 });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setActive(Math.min(chapters.length - 1, Math.max(0, Math.round(p * (chapters.length - 1)))));
  });
  const dark = chapters[active].dark;

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (travel * i) / (chapters.length - 1), behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div ref={ref} style={{ height: `${chapters.length * 100}svh` }} className="relative">
      <div
        className="sticky top-0 h-[100svh] min-h-[660px] w-full overflow-hidden"
        onPointerMove={(event) => {
          if (reducedMotion) return;
          const b = event.currentTarget.getBoundingClientRect();
          px.set((event.clientX - b.left) / b.width - 0.5);
        }}
        onPointerLeave={() => px.set(0)}
      >
        <Panorama progress={reducedMotion ? scrollYProgress : smooth} px={px} />
        <motion.div
          aria-hidden
          className="absolute left-0 top-0 z-40 h-1 w-full origin-left bg-[#FEC329]"
          style={{ scaleX: smooth }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-multiply"
          style={{ backgroundImage: grain }}
        />

        <SiteHeader variant="overlay" />

        <div className={`${shell} relative z-10 flex h-full flex-col items-center gap-5 pb-5 pt-[11svh] md:flex-row md:gap-12 md:pb-0 md:pt-14 lg:gap-16`}>
          <div className="order-2 md:order-1">
            <Phone active={active} progress={reducedMotion ? scrollYProgress : smooth} />
          </div>
          <div className="relative order-1 w-full flex-1 md:order-2 md:h-[60svh] md:self-start md:mt-[15svh]">
            {chapters.map((c, i) => {
              const on = i === active;
              const Heading = i === 0 ? "h1" : "h2";
              return (
                <motion.div
                  key={c.variant}
                  aria-hidden={!on}
                  className={`${i === 0 ? "relative" : "absolute inset-x-0 top-0"} ${on ? "" : "pointer-events-none"}`}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, y: on || reducedMotion ? 0 : 18 }}
                  transition={{ duration: 0.7, ease, delay: on ? 0.15 : 0 }}
                >
                  <p style={display} className="text-sm font-medium uppercase tracking-[0.14em] text-[#783F6A]">
                    {c.label}
                  </p>
                  <Heading
                    style={display}
                    className="relative mt-2 w-fit text-[clamp(2.5rem,6.4vw,6rem)] font-bold leading-[1.02] tracking-[-0.02em] text-[#5E2A5A] md:mt-3"
                  >
                    {c.title[0]}
                    <br />
                    {c.title[1]}{" "}
                    {/* Yellow as a highlighter stroke behind purple text: yellow text on the pale sky was unreadable. */}
                    <span className="bg-[linear-gradient(transparent_58%,#FEC329_58%,#FEC329_92%,transparent_92%)] px-[0.06em] text-[#783F6A] [box-decoration-break:clone]">
                      {c.title[2]}
                    </span>
                    {/* hand-drawn sparkle */}
                    <svg
                      aria-hidden
                      viewBox="0 0 60 60"
                      className="absolute -right-[0.55em] -top-[0.1em] hidden h-[0.62em] w-[0.62em] text-[#FEC329] sm:block"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                    >
                      <path d="M10 26c-2-8 0-15 6-20" />
                      <path d="M27 30c0-9 3-17 10-22" />
                      <path d="M40 40c4-7 9-11 16-12" />
                    </svg>
                  </Heading>
                  <p
                    style={display}
                    className="mt-4 max-w-[30rem] text-[clamp(1.05rem,1.75vw,1.6rem)] font-normal leading-[1.4] text-[#6B3566] md:mt-6"
                  >
                    {c.body}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-8 md:gap-4">
                    <a
                      href={c.link.href}
                      tabIndex={on ? 0 : -1}
                      style={display}
                      className="group inline-flex h-12 items-center gap-3 rounded-full bg-[#783F6A] px-6 text-[16px] font-medium text-white shadow-[0_8px_18px_-8px_rgba(94,42,90,0.7)] transition-transform hover:-translate-y-0.5 md:h-14 md:px-7 md:text-[18px]"
                    >
                      {c.link.label}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                    </a>
                    {i === 0 ? (
                      <>
                        <StoreButton
                          href={IOS_STORE_URL}
                          label="App Store"
                          tabIndex={on ? 0 : -1}
                          icon={<FaApple className="h-6 w-6" />}
                        />
                        <StoreButton
                          href={ANDROID_STORE_URL}
                          label="Google Play"
                          tabIndex={on ? 0 : -1}
                          icon={<GooglePlayMark className="h-6 w-6" />}
                        />
                      </>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col sm:right-6">
          {chapters.map((c, i) => (
            <button
              key={c.variant}
              type="button"
              aria-label={`Go to ${c.title.join(" ")}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              className="group flex h-8 w-8 items-center justify-center rounded-full"
            >
              <span
                className={`h-2 w-2 rounded-full transition-all ${dark ? "bg-[#3d1f3a]" : "bg-white"} ${i === active ? "scale-150 opacity-100" : "opacity-40 group-hover:opacity-80"}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Headline whose words fill in with colour one after another as it scrolls up the screen. */
function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const still = (useReducedMotion() ?? false) || isReactSnapPrerender();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.5"] });
  const words = text.split(" ");
  return (
    <h2 ref={ref} style={display} className={className}>
      {words.map((word, i) => (
        <ScrollWord key={i} progress={scrollYProgress} range={[i / words.length, (i + 1.5) / words.length]} still={still}>
          {word}
        </ScrollWord>
      ))}
    </h2>
  );
}

function ScrollWord({
  children,
  progress,
  range,
  still,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={still ? undefined : { opacity }}>{children} </motion.span>;
}

function ArrowLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={`group inline-flex items-center gap-3 text-[17px] font-medium ${className}`}>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
    </a>
  );
}

const featureIndex = [
  ["AI Vet", "Quick answers to everyday pet health questions."],
  ["Vet booking", "Find a clinic near you and book a visit."],
  ["Health tracker", "Vaccines, medications, records and reminders in one place."],
  ["Period tracker", "Predict heat and fertile days for your dog or cat."],
  ["PawShop", "Food and supplies from trusted Egyptian suppliers."],
  ["Hotel booking", "Boarding and daycare while you travel."],
  ["Adoption", "Pets looking for a new home."],
  ["PawSwiper", "Swipe to find a match for your pet."],
  ["Lost & Found", "Report a lost pet and help others find theirs."],
];

const faqs = [
  {
    question: "Is TwoPaws free to use?",
    answer:
      "Yes. The app is free on iOS and Android. You only pay for shop orders, and for vet visits and hotel stays, which you pay at the clinic or hotel.",
  },
  {
    question: "Is the AI Vet a real vet?",
    answer:
      "No. The AI Vet gives quick guidance on everyday health questions, based on your pet's profile, and you can attach a photo. It can be wrong and does not replace a vet, so for anything urgent or worrying, book a clinic visit in the app.",
  },
  {
    question: "How do I book a vet?",
    answer:
      "Open the menu, tap Vet Booking, and choose a clinic near you, your pet and a time. You pay at the clinic, get reminders before the visit, and any vaccines or medication the vet records go into your pet's health tracker.",
  },
  {
    question: "Where do you deliver?",
    answer:
      "The shop delivers across Cairo and Giza, and most Cairo orders arrive the same day. The delivery fee and estimated time for your address are shown at checkout before you pay.",
  },
  {
    question: "What can I buy in the shop?",
    answer:
      "Food, treats, litter, toys, collars and leashes, beds, flea and tick care, vitamins and grooming for cats and dogs, from verified Egyptian suppliers such as PetYard, Zima Pets, Dogzone, Wags and 7 Pets. You can compare sellers to find the best price.",
  },
  {
    question: "How can I pay?",
    answer:
      "Shop orders are paid cash on delivery or using cards. Card details are entered on a secure payment page and never stored by TwoPaws.",
  },
  {
    question: "Can I return an item?",
    answer:
      "Yes. Unopened items can be returned within 7 days of delivery. If something arrives damaged or wrong, tell us within 48 hours and we replace it or refund it in full.",
  },
  {
    question: "Is the app available in Arabic?",
    answer:
      "Yes. TwoPaws works in English and Arabic, and the AI Vet can answer in either.",
  },
];

const shell = "mx-auto w-full max-w-[1500px] px-6 sm:px-12 lg:px-20";

/** The TwoPaws home page. */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "TwoPaws",
  legalName: COMPANY_LEGAL_NAME,
  url: BASE_URL,
  logo: `${BASE_URL}/logotrans.png`,
  email: CONTACT_EMAIL,
  ...(CONTACT_PHONE ? { telephone: CONTACT_PHONE } : {}),
  address: { "@type": "PostalAddress", ...COMPANY_ADDRESS },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: CONTACT_EMAIL,
      ...(CONTACT_PHONE ? { telephone: CONTACT_PHONE } : {}),
      areaServed: "EG",
      availableLanguage: ["en", "ar"],
    },
  ],
  areaServed: "Egypt",
  sameAs: [INSTAGRAM_URL, FACEBOOK_URL, TIKTOK_URL, LINKEDIN_URL, IOS_STORE_URL, ANDROID_STORE_URL],
};

const mobileApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "TwoPaws",
  operatingSystem: ["iOS", "Android"],
  applicationCategory: "Lifestyle",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EGP" },
  downloadUrl: [IOS_STORE_URL, ANDROID_STORE_URL],
  publisher: { "@id": `${BASE_URL}/#organization` },
};

export default function Home() {
  return (
    <div className="clay-bg text-[#3d1f3a]">
      <Seo
        title="TwoPaws | Pet supplies, vets and pet care app in Egypt"
        description="TwoPaws connects pet families in Egypt with vet booking, an AI vet, a health tracker, a pet supplies shop with delivery, pet hotels, adoption and lost & found."
        canonicalUrl="/"
        structuredData={[organizationSchema, mobileApplicationSchema, faqSchema]}
      />
      {/* Only the home page shows the full park panorama, so only it preloads the strips. */}
      <Helmet>
        <link rel="preload" as="image" href="/clay/park-bg.webp" />
        <link rel="preload" as="image" href="/clay/park-fg.webp" {...{ fetchpriority: "high" }} />
      </Helmet>

      <main id="main">
      {/* PINNED PHONE STORY */}
      <Story />

      {/* ABOUT */}
      <section className="relative overflow-hidden py-24 sm:py-32 lg:py-44">
        <ClayProp name="paw" className="right-[3%] top-6 w-20 sm:w-24 lg:right-[4%] lg:top-10 lg:w-28" tilt={12} />
        <ClayProp name="bone" className="bottom-10 left-[3%] hidden w-28 sm:block lg:bottom-16 lg:left-[6%] lg:w-36" tilt={-10} />
        <div className={`${shell} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-16`}>
          <Reveal variant="left">
            <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]/80">About TwoPaws</p>
          </Reveal>
          <div>
            <ScrollWords
              className="text-[clamp(1.8rem,3.6vw,3.3rem)] font-normal leading-[1.15] tracking-[-0.02em] text-[#3d1f3a]"
              text="TwoPaws began as a passion project between two best friends who wanted a single, joyful space to track their pet’s health, meet other owners, book vets, and grab supplies."
            />
            <Reveal delay={0.1} className="mt-10 grid gap-8 sm:grid-cols-2 lg:mt-14 lg:max-w-3xl">
              <p className="text-[15px] leading-[1.75] text-[#3d1f3a]/75">
                Instead of juggling spreadsheets for vaccines, scrolling through scattered social groups, and hopping
                between apps to order food, we decided to build one intuitive experience.
              </p>
              <div>
                <p className="text-[15px] leading-[1.75] text-[#3d1f3a]/75">
                  We&rsquo;re not a corporation, just two lifelong friends and their furry co-founders on a mission to
                  make pet care simpler, more connected, and a lot more fun.
                </p>
                <ArrowLink href="/about" className="mt-6 text-[#783F6A]">
                  Our story
                </ArrowLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FEATURE INDEX */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <ClayProp name="ball" className="right-[5%] top-10 hidden w-20 md:block lg:w-24" tilt={0} />
        <div className={shell}>
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <h2
              style={display}
              className="text-[clamp(2rem,4vw,3.4rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#3d1f3a]"
            >
              Everything in the app
            </h2>
            <ArrowLink href="/features" className="text-[#783F6A]">
              All features
            </ArrowLink>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:mt-16 lg:grid-cols-3 lg:gap-6">
            {featureIndex.map(([name, text], i) => (
              <li key={name} className="clay-card clay-rise flex flex-col gap-1.5 p-4 last:col-span-2 sm:flex-row sm:gap-5 sm:p-6 lg:last:col-span-1">
                <span className="w-6 text-xs tabular-nums text-[#783F6A]/60 sm:pt-1">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p style={display} className="text-lg leading-tight text-[#3d1f3a] sm:text-xl">
                    {name}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-[#3d1f3a]/70 sm:text-sm sm:leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FEC329] py-24 sm:py-32">
        <div className={`${shell} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16`}>
          <Reveal variant="left">
            <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]/80">Questions</p>
            <h2
              style={display}
              className="mt-4 text-[clamp(2rem,4vw,3.4rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#3d1f3a]"
            >
              Good to know
            </h2>
          </Reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <Reveal key={faq.question} variant="right" delay={i * 0.1}>
              <AccordionItem value={`faq-${i}`} className="border-[#783F6A]/25">
                <AccordionTrigger
                  style={display}
                  className="py-6 text-left text-xl font-normal text-[#3d1f3a] hover:no-underline sm:text-2xl"
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-xl pb-6 text-[15px] leading-[1.75] text-[#3d1f3a]/75">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
              </Reveal>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CLOSING */}
      <section className="relative overflow-hidden py-28 sm:py-40">
        <ClayProp name="bowl" className="bottom-12 right-[5%] w-32 sm:w-44 lg:bottom-20 lg:right-[10%] lg:w-56" tilt={0} />
        <ClayProp name="ball" className="right-[32%] top-14 hidden w-16 lg:block" tilt={0} />
        <div className={shell}>
          <Reveal>
            <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]/80">Free on iOS and Android</p>
            <h2
              style={display}
              className="mt-5 max-w-4xl text-[clamp(2.6rem,7vw,6.2rem)] font-normal leading-[0.98] tracking-[-0.025em] text-[#3d1f3a]"
            >
              Bring your pet
              <br />
              home to TwoPaws
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <StoreButton href={IOS_STORE_URL} label="App Store" icon={<FaApple className="h-6 w-6" />} />
              <StoreButton href={ANDROID_STORE_URL} label="Google Play" icon={<GooglePlayMark className="h-6 w-6" />} />
            </div>
          </Reveal>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}
