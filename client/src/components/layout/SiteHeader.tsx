import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import twoPawsLogo from "../../../../attached_assets/logotrans-brand-800.webp";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

export function SignedOutActions() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" className="border-slate-200">
        <Link to="/login">Sign in</Link>
      </Button>
      <Button asChild className="hidden bg-brand-green-dark text-white sm:inline-flex">
        <Link to="/login?mode=signup">Sign up</Link>
      </Button>
    </div>
  );
}

type SiteHeaderProps = {
  /** Right-hand controls next to the Download button; omitted on pages that need no account. */
  actions?: ReactNode;
  /** Optional second row under the nav, e.g. the shop search box. */
  children?: ReactNode;
};

export default function SiteHeader({ actions, children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-16 w-full max-w-[1480px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:border-brand-green-dark hover:text-brand-green-dark md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4 text-sm text-slate-700">
                {siteNavLinks.map((link) => (
                  <Link key={link.href} to={link.href} className="hover:text-brand-green-dark">
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-2 w-full bg-brand-purple text-white hover:opacity-90">
                  <a href="/download/">Download the app</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex shrink-0 items-center" aria-label="TwoPaws home">
            <img src={twoPawsLogo} alt="TwoPaws" width={800} height={183} className="h-9 w-auto sm:h-10" />
          </Link>
        </div>
        <nav className="hidden items-center justify-center gap-7 text-sm font-medium text-slate-600 md:flex">
          {siteNavLinks.map((link) => (
            <Link key={link.href} to={link.href} className="transition-colors hover:text-brand-green-dark">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="col-start-3 flex items-center gap-2 sm:gap-3">
          <Button asChild className={`h-9 rounded-md bg-brand-purple px-5 text-white hover:opacity-90 ${actions ? "hidden lg:inline-flex" : ""}`}>
            <a href="/download/">Download</a>
          </Button>
          {actions}
        </div>
      </div>
      {children ? (
        <div className="border-t border-slate-100 px-4 py-3 sm:px-6 lg:px-8">{children}</div>
      ) : null}
    </header>
  );
}
