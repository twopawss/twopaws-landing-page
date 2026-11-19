import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Horizontal logo: purple "TWO", yellow "PAWS". */
export const LOGO_SRC = "/clay/logo-purple.webp";

/**
 * The one site header. Every page family renders it. Landing, marketing and policy pages pass no
 * `actions` and show only the Download call to action (so those pages still never load Firebase);
 * pages under FirebaseShell pass <AccountActions /> for the account menu, with the cart where it
 * applies (shop pages).
 */
export const siteNavLinks = [
  { href: "/", label: "Home" },
  { href: "/shop/", label: "Shop" },
  { href: "/events", label: "Events" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];

/** Sign in / Sign up, returning the visitor to the page they were on (the login page's default is the shop). */
export function SignedOutActions() {
  const location = useLocation();
  const onLoginPage = location.pathname.replace(/\/+$/, "") === "/login";
  const redirect = onLoginPage ? "" : `redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
  const joiner = redirect ? "&" : "";
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" className="border-[#783F6A]/30 bg-white/80 text-[#783F6A]">
        <Link to={`/login${redirect ? `?${redirect}` : ""}`}>Sign in</Link>
      </Button>
      <Button asChild className="hidden bg-[#783F6A] text-white hover:bg-[#6a365d] sm:inline-flex">
        <Link to={`/login?mode=signup${joiner}${redirect}`}>Sign up</Link>
      </Button>
    </div>
  );
}

type SiteHeaderProps = {
  /** Right-hand controls next to the Download button; omitted on pages that need no account. */
  actions?: ReactNode;
  /** Optional second row under the nav, e.g. the shop search box. */
  children?: ReactNode;
  /** "solid" is the sticky white bar; "overlay" sits transparently on top of a hero (home page). */
  variant?: "solid" | "overlay";
};

export default function SiteHeader({ actions, children, variant = "solid" }: SiteHeaderProps) {
  const bar =
    variant === "overlay"
      ? "absolute inset-x-0 top-0 z-30"
      : "sticky top-0 z-40 border-b border-[#783F6A]/10 bg-white/90 backdrop-blur-md";

  return (
    <header className={`${bar} text-[#783F6A]`}>
      <div className="mx-auto grid h-16 w-full max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#783F6A]/25 bg-white/70 md:hidden"
                aria-label="Open menu"
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
                {siteNavLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-2 w-full bg-[#783F6A] text-white hover:bg-[#6a365d]">
                  <a href="/download/">Download the app</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex shrink-0 items-center" aria-label="TwoPaws home">
            <img src={LOGO_SRC} alt="TwoPaws" width={900} height={172} className="h-8 w-auto sm:h-9" />
          </Link>
        </div>
        <nav className="hidden items-center justify-start gap-8 pl-6 text-[15px] md:flex">
          {siteNavLinks.map((link) => (
            <Link key={link.href} to={link.href} className="transition-opacity hover:opacity-70">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="col-start-3 flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            className={`font-display h-10 bg-[#783F6A] px-5 text-[15px] text-white hover:bg-[#6a365d] ${actions ? "hidden lg:inline-flex" : ""}`}
          >
            <a href="/download/">Download</a>
          </Button>
          {actions}
        </div>
      </div>
      {children ? (
        <div className="mx-auto w-full max-w-[1500px] border-t border-[#783F6A]/10 px-4 py-3 sm:px-8 lg:px-12">{children}</div>
      ) : null}
    </header>
  );
}
