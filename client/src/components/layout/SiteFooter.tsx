import {
  ANDROID_STORE_URL,
  COMPANY_ADDRESS_TEXT,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  FACEBOOK_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
  LINKEDIN_URL,
  TIKTOK_URL,
} from "@/lib/seo/constants";
import { LOGO_SRC } from "./SiteHeader";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/shop/", label: "Shop" },
      { href: "/events", label: "Events" },
      { href: "/features/", label: "Features" },
      { href: "/about/", label: "About us" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact/", label: "Contact us" },
      { href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL },
      { href: `tel:${CONTACT_PHONE}`, label: CONTACT_PHONE_DISPLAY },
      { href: "/shipping-and-returns/", label: "Shipping & Returns" },
      { href: "/privacy/", label: "Privacy Policy" },
      { href: "/terms/", label: "Terms & Conditions" },
    ],
  },
  {
    title: "Get the app",
    links: [
      { href: IOS_STORE_URL, label: "App Store", external: true },
      { href: ANDROID_STORE_URL, label: "Google Play", external: true },
    ],
  },
  {
    title: "Follow",
    links: [
      { href: INSTAGRAM_URL, label: "Instagram", external: true },
      { href: FACEBOOK_URL, label: "Facebook", external: true },
      { href: TIKTOK_URL, label: "TikTok", external: true },
      { href: LINKEDIN_URL, label: "LinkedIn", external: true },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#783F6A]/10 bg-[#fdf6fa] text-[#3d1f3a]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-14 sm:px-12 lg:px-20">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <img src={LOGO_SRC} alt="TwoPaws" width={900} height={172} loading="lazy" className="h-9 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#3d1f3a]/70">
              Your pet&rsquo;s best friend in Egypt. Connecting pet families with the care and community they deserve.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-medium uppercase tracking-[0.14em] text-[#783F6A]">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-[#3d1f3a]/75">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="transition-colors hover:text-[#783F6A]"
                      {...("external" in l ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-[#783F6A]/15 pt-6 text-sm text-[#3d1f3a]/60">
          &copy; {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. {COMPANY_ADDRESS_TEXT}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
