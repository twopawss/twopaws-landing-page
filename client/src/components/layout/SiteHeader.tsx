import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const LOGO_SRC = "/clay/logo-purple.webp";

export type NavLink = { href: string; label: string };

export const mainNavLinks: NavLink[] = [
  { href: "/features", label: "Features" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact us" },
];

type SiteHeaderProps = {
  /** "solid" is a fixed white bar; "overlay" sits transparently on top of a hero. */
  variant?: "solid" | "overlay";
  links?: NavLink[];
  /** Replaces the default Download button on the right. */
  right?: ReactNode;
  homeHref?: string;
};

export function DownloadPill() {
  return (
    <a
      href="/download"
      className="font-display inline-flex h-10 items-center rounded-full bg-[#783F6A] px-5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
    >
      Download
    </a>
  );
}

/** The one header used across the site: logo, quiet text links, and a single action on the right. */
export default function SiteHeader({ variant = "solid", links = mainNavLinks, right, homeHref = "/" }: SiteHeaderProps) {
  const bar =
    variant === "overlay"
      ? "absolute inset-x-0 top-0 z-30"
      : "fixed inset-x-0 top-0 z-40 border-b border-[#783F6A]/10 bg-white/90 backdrop-blur-md";

  return (
    <header className={`${bar} text-[#783F6A]`}>
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-4 px-4 sm:gap-10 sm:px-8 lg:px-12">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#783F6A]/25 bg-white/70 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-6">
            <SheetHeader className="text-left">
              <SheetTitle>
                <img src={LOGO_SRC} alt="TwoPaws" className="h-8 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <nav className="font-display mt-8 flex flex-col gap-5 text-lg text-[#5E2A5A]">
              <a href={homeHref}>Home</a>
              {links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <a href={homeHref} aria-label="TwoPaws home" className="shrink-0">
          <img src={LOGO_SRC} alt="TwoPaws" width={900} height={172} className="h-8 w-auto sm:h-9" />
        </a>

        <nav className="hidden items-center gap-8 text-[15px] md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-opacity hover:opacity-70">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">{right ?? <DownloadPill />}</div>
      </div>
    </header>
  );
}
