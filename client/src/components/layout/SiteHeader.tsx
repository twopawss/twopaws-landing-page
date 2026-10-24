import type { ReactNode } from "react";
import { Menu, ShoppingCart } from "lucide-react";
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
 * The one site header. Every page family renders it: landing, marketing and policy pages pass no
 * `actions` and get the static signed-out controls (so those pages still never load Firebase);
 * pages under FirebaseShell pass <AccountActions /> for the live cart count and account menu.
 */
export const siteNavLinks = [
  { href: "/", label: "Home" },
  { href: "/shop/", label: "Shop" },
  { href: "/events", label: "Events" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];

export function CartLink({ itemCount = 0 }: { itemCount?: number }) {
  return (
    <Link
      to="/cart"
      className="relative inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 hover:border-brand-green-dark hover:text-brand-green-dark"
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-brand-olive px-1.5 text-xs font-semibold text-brand-dark">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

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
  /** Right-hand controls. Defaults to a static cart link plus Sign in / Sign up. */
  actions?: ReactNode;
  /** Optional second row under the nav, e.g. the shop search box. */
  children?: ReactNode;
};

export default function SiteHeader({ actions, children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
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
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex shrink-0 items-center" aria-label="TwoPaws home">
            <img src={twoPawsLogo} alt="TwoPaws" width={800} height={183} className="h-9 w-auto sm:h-10" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {siteNavLinks.map((link) => (
              <Link key={link.href} to={link.href} className="transition-colors hover:text-brand-green-dark">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {actions ?? (
            <>
              <CartLink />
              <SignedOutActions />
            </>
          )}
        </div>
      </div>
      {children ? (
        <div className="border-t border-slate-100 px-4 py-3 sm:px-6 lg:px-8">{children}</div>
      ) : null}
    </header>
  );
}
