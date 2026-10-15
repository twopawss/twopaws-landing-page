import type { ReactNode } from "react";
import {
  ANDROID_STORE_URL,
  COMPANY_ADDRESS_TEXT,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

const navLinks = [
  { href: "/shop/", label: "Shop" },
  { href: "/about/", label: "About" },
  { href: "/features/", label: "Features" },
  { href: "/egypt/", label: "Egypt" },
  { href: "/contact/", label: "Contact" },
  { href: "/shipping-and-returns/", label: "Shipping & returns" },
  { href: "/privacy/", label: "Privacy" },
  { href: "/terms/", label: "Terms" },
];

type MarketingShellProps = {
  children: ReactNode;
};

export default function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a className="text-lg font-semibold text-slate-900" href="/">
            TwoPaws
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-24">
        {children}
      </main>

      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{COMPANY_LEGAL_NAME}</p>
            <p>{COMPANY_ADDRESS_TEXT}</p>
            <p className="mt-1 flex flex-wrap gap-3">
              <a className="hover:text-slate-900" href="/contact/">Contact</a>
              <a className="hover:text-slate-900" href="/shipping-and-returns/">Shipping & returns</a>
              <a className="hover:text-slate-900" href="/privacy/">Privacy</a>
              <a className="hover:text-slate-900" href="/terms/">Terms</a>
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-slate-900" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            <a className="hover:text-slate-900" href={INSTAGRAM_URL}>
              Instagram
            </a>
            <a className="hover:text-slate-900" href={IOS_STORE_URL}>
              App Store
            </a>
            <a className="hover:text-slate-900" href={ANDROID_STORE_URL}>
              Google Play
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
