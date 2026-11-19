import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Linkedin,
  Map as FoldedMap,
  MapPin,
  Menu,
  Search,
  X,
} from "lucide-react";
import insta from "../../../attached_assets/instagram.svg";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";
import twoPawsLogo from "../../../attached_assets/logotrans-brand-800.webp";
import aiVetIcon from "@assets/aivet-320.webp";
import vetsIcon from "@assets/vets-320.webp";
import healthIcon from "@assets/healthtracker-320.webp";
import hotelsIcon from "@assets/hotels-320.webp";
import shopIcon from "@assets/shop-320.webp";
import adoptionIcon from "@assets/adoption-320.webp";
import marriageIcon from "@assets/marriage-320.webp";
import periodTrackerIcon from "@assets/periodtracker-320.webp";
import freshFoodIcon from "@assets/fresh-320.webp";
import phoneMockup from "@assets/phone-mockup-900.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Seo from "@/lib/seo/Seo";
import { isReactSnapPrerender } from "@/lib/isPrerender";
import {
  ANDROID_STORE_URL,
  BASE_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

type OfferItem = {
  iconSrc?: string;
  label?: string;
  fallback?: "search" | "map";
};

const offerRowOne: OfferItem[] = [
  { iconSrc: aiVetIcon, label: "AI VET" },
  { iconSrc: vetsIcon, label: "VET BOOKING" },
  { iconSrc: healthIcon, label: "HEALTH CARE" },
  { iconSrc: hotelsIcon, label: "HOTEL BOOKING" },
  { iconSrc: shopIcon, label: "SHOP" },
];

const offerRowTwo: OfferItem[] = [
  { iconSrc: adoptionIcon, label: "ADOPTION OFFERS" },
  { iconSrc: marriageIcon, label: "MARRIAGE OFFERS" },
  { iconSrc: freshFoodIcon, label: "FRESHFOOD" },
  { iconSrc: periodTrackerIcon, label: "PERIOD TRACKER" },
];

function OfferCell({
  item,
  reducedMotion = false,
}: {
  item: OfferItem;
  reducedMotion?: boolean;
}) {
  return (
    <motion.div
      className="group flex min-w-[148px] flex-col items-center justify-start gap-2 text-center sm:min-w-[196px] lg:min-w-[228px]"
      whileHover={reducedMotion ? undefined : { y: -10, rotate: -1.5 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
    >
      {item.iconSrc ? (
        <img
          src={item.iconSrc}
          alt={item.label ?? "TwoPaws feature"}
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
          className="h-20 w-20 object-contain transition-transform duration-500 group-hover:scale-110 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center text-brand-purple sm:h-28 sm:w-28 lg:h-32 lg:w-32">
          {item.fallback === "search" ? (
            <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-gray-200">
              <Search className="h-8 w-8 sm:h-11 sm:w-11" strokeWidth={2.2} />
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center">
              <FoldedMap
                className="h-12 w-12 sm:h-20 sm:w-20"
                strokeWidth={2.2}
              />
              <MapPin
                className="absolute -top-1 right-2 h-6 w-6 sm:top-0 sm:right-3 sm:h-8 sm:w-8"
                strokeWidth={2.2}
              />
            </div>
          )}
          {item.fallback !== "search" && item.fallback !== "map" ? (
            <Search className="h-10 w-10" strokeWidth={2.2} />
          ) : null}
        </div>
      )}

      {item.label ? (
        <p className="font-marvin text-lg uppercase leading-5 text-brand-purple sm:text-2xl sm:leading-6 lg:text-[1.75rem] lg:leading-7">
          {item.label}
        </p>
      ) : null}
    </motion.div>
  );
}

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0 },
};

const revealTransition = {
  duration: 0.75,
  ease: [0.22, 1, 0.36, 1] as const,
};

function OpeningScreen({ reducedMotion }: { reducedMotion: boolean }) {
  const [isVisible, setIsVisible] = useState(() => !isReactSnapPrerender());

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    const finishIntro = () => setIsVisible(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishIntro();
    };
    const timer = window.setTimeout(finishIntro, reducedMotion ? 350 : 2300);

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible, reducedMotion]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-white"
          initial={reducedMotion ? { opacity: 1 } : { y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { y: "-100%" }}
          transition={{
            duration: reducedMotion ? 0.15 : 0.85,
            ease: [0.76, 0, 0.24, 1],
          }}
          aria-label="TwoPaws introduction"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-1 bg-brand-yellow"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: reducedMotion ? 0.2 : 2.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: "left" }}
          />

          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute h-64 w-64 rounded-full border border-brand-yellow/50 sm:h-80 sm:w-80"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.65 }}
              animate={{ opacity: [0, 0.65, 0], scale: [0.65, 1, 1.18] }}
              transition={{
                duration: reducedMotion ? 0.2 : 1.8,
                times: [0, 0.45, 1],
                ease: "easeOut",
              }}
            />
            <motion.img
              src={twoPawsLogo}
              alt="TwoPaws"
              width={800}
              height={556}
              decoding="async"
              className="relative z-10 w-44 sm:w-56 lg:w-64"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.86, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0.15 : 0.8,
                delay: reducedMotion ? 0 : 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>

          <motion.div
            className="absolute bottom-6 left-6 h-3 w-3 rounded-full bg-brand-yellow sm:bottom-8 sm:left-8"
            animate={reducedMotion ? undefined : { scale: [1, 1.8, 1], opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 90, damping: 22 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 90, damping: 22 });
  const dogX = useTransform(smoothPointerX, [-0.5, 0.5], [-12, 12]);
  const dogY = useTransform(smoothPointerY, [-0.5, 0.5], [-8, 8]);
  const catX = useTransform(smoothPointerX, [-0.5, 0.5], [14, -14]);
  const catY = useTransform(smoothPointerY, [-0.5, 0.5], [10, -10]);
  const illustrationX = useTransform(smoothPointerX, [-0.5, 0.5], [-20, 20]);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const headlineScrollY = useTransform(heroScrollProgress, [0, 1], [0, 68]);
  const heroMediaScale = useTransform(heroScrollProgress, [0, 1], [1, 1.035]);

  const faqs = [
    {
      question: "Is TwoPaws free to use?",
      answer: "Yes! TwoPaws is completely free to download and use.",
    },
    {
      question: "Which cities in Egypt do you cover?",
      answer:
        "We currently cover Cairo with plans to expand to more governorates soon.",
    },
    {
      question: "Can I track multiple pets?",
      answer:
        "Absolutely! You can add unlimited pets to your account. Each pet gets their own profile with separate health records, vaccination schedules, and vet history. Perfect for multi-pet families!",
    },
  ];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TwoPaws",
    url: BASE_URL,
    areaServed: "Egypt",
    sameAs: [INSTAGRAM_URL, IOS_STORE_URL, ANDROID_STORE_URL],
  };

  const mobileApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "TwoPaws",
    operatingSystem: ["iOS", "Android"],
    applicationCategory: "Lifestyle",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    downloadUrl: [IOS_STORE_URL, ANDROID_STORE_URL],
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-poppins">
      <OpeningScreen reducedMotion={reducedMotion} />
      <Seo
        title="TwoPaws | Pet care app in Egypt"
        description="TwoPaws connects pet families in Egypt with vets, clinics, a supplies marketplace, community features, and delivery."
        canonicalUrl="/"
        structuredData={[organizationSchema, mobileApplicationSchema]}
      />

      <div className="w-full bg-white">
        <nav className="relative z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex min-h-[64px] w-full max-w-[1500px] items-center justify-between px-4 sm:px-8 lg:px-10">
            <a href="/" className="flex shrink-0 items-center">
              <img
                src={twoPawsLogo}
                alt="TwoPaws"
                className="h-10 w-auto sm:h-12"
              />
            </a>

            {/* Desktop */}
            <div className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
              <button
                onClick={() => scrollToSection("features")}
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                FAQ
              </button>
              <a
                href="/shop"
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                Shop
              </a>
              <a
                href="/terms"
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                Terms &amp; Conditions
              </a>
              <a
                href="/privacy"
                className="nav-link-interactive transition-colors hover:text-brand-purple"
              >
                Privacy Policy
              </a>
            </div>

            <div className="hidden md:block">
              <Button
                asChild
                className="h-9 rounded-md bg-brand-purple px-5 text-white hover:opacity-90"
              >
                <a href="/download">Download</a>
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center text-brand-purple md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div className="border-t border-gray-100 px-4 py-4 md:hidden">
              <div className="flex flex-col gap-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-left"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("faq")}
                  className="text-left"
                >
                  FAQ
                </button>
                <a href="/shop">Shop</a>
                <a href="/terms">Terms &amp; Conditions</a>
                <a href="/privacy">Privacy Policy</a>
                <Button
                  asChild
                  className="mt-2 w-full rounded-md bg-brand-purple text-white hover:opacity-90"
                >
                  <a href="/download">Download</a>
                </Button>
              </div>
            </div>
          ) : null}
        </nav>

        {/* HERO (matches reference) */}
        <section
          ref={heroRef}
          className="relative z-20 overflow-hidden bg-brand-yellow"
          onPointerMove={(event) => {
            if (reducedMotion) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
            pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
          }}
          onPointerLeave={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
        >
          <div className="relative mx-auto w-full max-w-[1500px] overflow-visible">
            {/* Adjust collage overlap via the CSS variables on this container */}
            <div
              className="relative h-[380px] sm:h-[480px] lg:h-[560px]
                [--headline-x:18px] [--headline-y:270px] 
                [--dog-right:-16px] [--dog-bottom:-1px] [--dog-h:70%] [--dog-z:10]
                [--cat-x:45%] [--cat-bottom:-30px] [--cat-h:22%] [--cat-z:30]
                [--illus-left-x:65%] [--illus-left-bottom:-30px] [--illus-left-h:24%] [--illus-left-z:70]
                [--illus-right-x:26%] [--illus-right-bottom:-4px] [--illus-right-h:24%] [--illus-right-z:35]
                sm:[--headline-x:42px] sm:[--headline-y:108px]
                sm:[--dog-h:90%] sm:[--cat-h:31%] sm:[--illus-left-h:34%] sm:[--illus-right-bottom:-1px] sm:[--illus-right-h:34%]
                lg:[--headline-x:70px] lg:[--headline-y:50px]
                lg:[--dog-h:470px] lg:[--cat-x:1100px] lg:[--cat-h:200px]
                lg:[--illus-left-x:1260px] lg:[--illus-left-h:250px]
                lg:[--illus-right-x:970px] lg:[--illus-right-h:250px]"
            >
              {/* Headline */}
              <motion.div
                className="absolute z-30"
                style={{
                  left: "var(--headline-x)",
                  bottom: "var(--headline-y)",
                  y: reducedMotion ? 0 : headlineScrollY,
                }}
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
                variants={reveal}
                transition={revealTransition}
              >
                <h1 className="font-marvin text-[1.5rem] uppercase leading-[0.9] tracking-tight text-white sm:text-[3.7rem] lg:text-[5.1rem]">
                  YOUR PET,
                  <br />
                  OUR PRIORITY
                </h1>
                <div className="mt-4 flex flex-row gap-1 sm:gap-3 sm:items-center">
                  <Button
                    asChild
                    size="sm"
                    className="interactive-button h-6 px-1.5 text-[10px] bg-brand-purple text-white hover:opacity-90 sm:h-10 sm:px-4 sm:text-sm"
                  >
                    <a href={IOS_STORE_URL} target="_blank" rel="noreferrer">
                      Download on App Store
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="interactive-button h-6 px-1.5 text-[10px] whitespace-nowrap border-white bg-transparent text-white hover:bg-white hover:text-brand-purple sm:h-10 sm:px-4 sm:text-sm"
                  >
                    <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer">
                      Get it on Google Play
                    </a>
                  </Button>
                </div>
              </motion.div>

              {/* Dog */}
              <motion.img
                src="/iStock-157527277.webp"
                alt="Dog"
                decoding="async"
                className="pointer-events-none absolute w-auto max-w-none object-contain"
                style={{
                  right: "var(--dog-right)",
                  bottom: "var(--dog-bottom)",
                  height: "var(--dog-h)",
                  zIndex: "var(--dog-z)",
                  x: reducedMotion ? 0 : dogX,
                  y: reducedMotion ? 0 : dogY,
                  scale: reducedMotion ? 1 : heroMediaScale,
                }}
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...revealTransition, delay: 0.12 }}
              />

              {/* Cat */}
              <motion.img
                src="/iStock-1143440918.webp"
                alt="Cat"
                decoding="async"
                className="pointer-events-none absolute w-auto -translate-x-1/2 object-contain"
                style={{
                  left: "var(--cat-x)",
                  bottom: "var(--cat-bottom)",
                  height: "var(--cat-h)",
                  zIndex: "var(--cat-z)",
                  x: reducedMotion ? 0 : catX,
                  y: reducedMotion ? 0 : catY,
                }}
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...revealTransition, delay: 0.3 }}
              />

              {/* Illustration (left) */}
              <motion.img
                src="/illustration-2.svg"
                alt=""
                aria-hidden
                decoding="async"
                className="pointer-events-none absolute w-auto -translate-x-1/2 object-contain"
                style={{
                  left: "var(--illus-left-x)",
                  bottom: "var(--illus-left-bottom)",
                  height: "var(--illus-left-h)",
                  zIndex: "var(--illus-left-z)",
                  x: reducedMotion ? 0 : illustrationX,
                }}
                animate={reducedMotion ? undefined : { y: [0, -8, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 5.5, ease: "easeInOut", repeat: Infinity }}
              />

              {/* Illustration (right) - no more legs leaking into About */}
              <motion.img
                src="/illustration-1.svg"
                alt=""
                aria-hidden
                decoding="async"
                className="pointer-events-none absolute w-auto -translate-x-1/2 object-contain"
                style={{
                  left: "var(--illus-right-x)",
                  bottom: "var(--illus-right-bottom)",
                  height: "var(--illus-right-h)",
                  zIndex: "var(--illus-right-z)",
                  x: reducedMotion ? 0 : illustrationX,
                }}
                animate={reducedMotion ? undefined : { y: [0, 7, 0], rotate: [0, -1.5, 0] }}
                transition={{ duration: 6.5, ease: "easeInOut", repeat: Infinity }}
              />
            </div>
          </div>
        </section>

        {/* ABOUT (spacing + typography like reference) */}
        <section
          id="about"
          className="relative overflow-visible bg-white px-4 pb-10 pt-24 sm:px-8 sm:pb-12 sm:pt-28 lg:px-10 lg:pb-14 lg:pt-32"
        >
          <motion.div
            className="relative z-20 mx-auto grid w-full max-w-[1366px] items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10"
            initial={reducedMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            transition={revealTransition}
          >
            <motion.div
              className="flex justify-center pt-1 lg:justify-start lg:pt-0"
              whileHover={reducedMotion ? undefined : { y: -12, rotate: -2 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <img
                src={phoneMockup}
                alt="TwoPaws app preview"
                width={900}
                height={1661}
                loading="lazy"
                decoding="async"
                className="w-[190px] max-w-full object-contain sm:w-[205px] lg:w-[220px]"
              />
            </motion.div>

            <div className="text-right">
              <h2 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[3.35rem]">
                ABOUT TWOPAWS
              </h2>

              <div className="mx-auto mt-5 max-w-[980px] space-y-5 text-lg leading-[1.25] sm:text-xl lg:text-[1.3rem]">
                <p className="text-brand-purple">
                  TwoPaws began as a passion project between two best friends
                  who wanted a{" "}
                  <span className="font-semibold">
                    single, joyful space to track their pet&rsquo;s health, meet
                    other owners, book vets, and grab supplies
                  </span>{" "}
                  - something that simply didn&rsquo;t exist in our part of the
                  world.
                </p>

                <p className="text-[#f195cb]">
                  Instead of juggling spreadsheets for vaccines, scrolling
                  through scattered social groups, and hopping between apps to
                  order food, we decided to build{" "}
                  <span className="font-semibold">
                    one intuitive experience
                  </span>{" "}
                  that puts everything a pet parent needs in the palm of their
                  hand.
                </p>

                <p className="mx-auto max-w-[980px] font-medium text-brand-yellow text-right">
                  We&rsquo;re not a corporation - just two lifelong friends (and
                  their furry co-founders) on a mission to make pet care
                  simpler, more connected, and a lot more fun. Thanks for
                  joining us on the journey!
                </p>
              </div>
            </div>
          </motion.div>

         
        </section>

        {/* FEATURES */}
        <section
          id="features"
          className="relative z-20 bg-white px-4 pb-14 sm:px-8 sm:pb-20 lg:px-12"
        >
          <div className="relative z-20 mx-auto w-full max-w-[1650px]">
            <motion.h2
              className="font-marvin text-5xl uppercase text-brand-purple sm:text-5xl lg:text-[3.35rem]"
              initial={reducedMotion ? false : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={reveal}
              transition={revealTransition}
            >
              WHAT WE OFFER
            </motion.h2>

            <div className="feature-rails mt-10 space-y-8 overflow-hidden py-3">
              <div className="feature-track feature-track-forward flex w-max gap-4 sm:gap-7">
                {[...offerRowOne, ...offerRowOne].map((item, index) => (
                  <OfferCell key={`row-one-${index}`} item={item} reducedMotion={reducedMotion} />
                ))}
              </div>

              <div className="feature-track feature-track-reverse flex w-max gap-4 sm:gap-7">
                {[...offerRowTwo, ...offerRowTwo, ...offerRowTwo].map((item, index) => (
                  <OfferCell key={`row-two-${index}`} item={item} reducedMotion={reducedMotion} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT COMPANY (wing behind + bottom-right like reference) */}
        <section
          id="company"
          className="relative overflow-hidden bg-brand-yellow px-3 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
        >
          <img
            src="/shape-6.png"
            alt=""
            aria-hidden
            width={220}
            height={220}
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute -right-8 -top-10 hidden w-[100px] -scale-x-100 opacity-95 sm:block lg:-right-0 lg:-top-0 lg:w-[160px]"
          />

          <div className="relative z-10 mx-auto w-full max-w-[1366px]">
            <h2 className="text-center font-marvin text-4xl uppercase text-white sm:text-5xl lg:text-[3.35rem]">
              ABOUT THE COMPANY
            </h2>
            <p className="mx-auto mt-3 max-w-[940px] text-center text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.45rem]">
              TwoPaws is an Egyptian start-up on a mission to build the
              country&rsquo;s first all-in-one pet community platform, uniting
              health tracking, adoption, shopping, and social features so every
              pet family can thrive.
            </p>

            <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start lg:mt-12 lg:gap-14">
              <motion.div
                className="md:justify-self-start"
                initial={reducedMotion ? false : { opacity: 0, x: -36 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                whileHover={reducedMotion ? undefined : { x: 8 }}
                transition={revealTransition}
              >
                <h3 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[2.65rem]">
                  AMIRA SAMEH
                </h3>
                <p className="mt-1 font-marvin text-3xl uppercase text-white sm:text-4xl lg:text-[2.1rem]">
                  CO-FOUNDER
                </p>
                <p className="mt-3 max-w-[620px] text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.22rem]">
                  Vision-driven community champion and self-taught developer who
                  loves turning everyday pet parent struggles into intuitive,
                  tech-powered solutions for the whole community.
                </p>
              </motion.div>

              <motion.div
                className="md:justify-self-start md:text-right md:mt-12 lg:mt-14"
                initial={reducedMotion ? false : { opacity: 0, x: 36 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                whileHover={reducedMotion ? undefined : { x: -8 }}
                transition={revealTransition}
              >
                <h3 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[2.65rem]">
                  HASSAN REDA
                </h3>
                <p className="mt-1 font-marvin text-3xl uppercase text-white sm:text-4xl lg:text-[2.1rem]">
                  CO-FOUNDER
                </p>
                <p className="mt-3 max-w-[640px] text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.22rem]">
                  Product strategist and full-stack engineer who prototypes
                  ideas at lightning speed, obsessed with details that make
                  Egypt&rsquo;s pet community smarter, safer, and more fun.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      {/* FAQ Section */}
      <section id="faq" className="bg-brand-purple px-3 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[1366px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="font-marvin text-4xl uppercase text-white sm:text-5xl lg:text-[3.35rem]">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-3 max-w-[940px] text-center text-lg leading-tight text-white sm:text-xl lg:text-[1.45rem]">
              Everything you need to know about TwoPaws
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <Card
                  key={index}
                  className="border-2 border-brand-purple/30 bg-white/90 shadow-[0_8px_0_rgba(84,54,120,0.12)]"
                >
                  <AccordionItem value={`item-${index}`} className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <span className="font-marvin text-xl uppercase text-brand-yellow text-left sm:text-2xl">
                        {faq.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-5">
                      <p className="text-lg leading-tight text-brand-yellow sm:text-xl">
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Card>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="cta" className="bg-white px-3 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-[1366px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[3.35rem]">
              Ready to Give Your Pet the Best Life?
            </h2>
            <p className="mx-auto mt-3 max-w-[940px] text-center text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.45rem]">
              Join thousands of pet families who trust TwoPaws for their pet
              care needs.
            </p>

            <p className="mt-5 text-lg font-semibold text-brand-purple sm:text-xl">
              Follow us to know the latest updates
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                className="bg-brand-yellow text-brand-purple border border-brand-purple/20 hover:bg-brand-yellow/90 font-semibold shadow-lg shadow-brand-purple/10"
              >
                <a href={IOS_STORE_URL} target="_blank" rel="noreferrer">
                  Download on App Store
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white"
              >
                <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer">
                  Get it on Google Play
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* --- Top Grid -------------------------------------------------- */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand + Socials */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img
                  src={twoPawsLogo}
                  alt="TwoPaws"
                  width={800}
                  height={556}
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-auto"
                />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with
                the care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/twopaws.app/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={insta}
                    alt="Instagram"
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 w-6"
                  />
                </a>
                <a
                  href="https://www.facebook.com/twopawsapp/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={facebook}
                    alt="Facebook"
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 w-6"
                  />
                </a>
                <a
                  href="https://www.tiktok.com/@twopaws.app"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={tiktok}
                    alt="TikTok"
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="h-6 w-6"
                  />
                </a>
                <a
                  href="https://www.linkedin.com/company/twopaws/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => scrollToSection?.("features")}
                    className="hover:text-black transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("about")}
                    className="hover:text-black transition-colors"
                  >
                    About&nbsp;Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("testimonials")}
                    className="hover:text-black transition-colors"
                  >
                    Reviews
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("faq")}
                    className="hover:text-black transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="mailto:info@twopaws.pet"
                    className="hover:text-black transition-colors"
                  >
                    Contact&nbsp;Us
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-black transition-colors"
                  >
                    Privacy&nbsp;Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="hover:text-black transition-colors"
                  >
                    Terms&nbsp;&amp;&nbsp;Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* --- Bottom Bar ---------------------------------------------- */}
          <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              (c) {new Date().getFullYear()} TwoPaws Digital Solutions. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
