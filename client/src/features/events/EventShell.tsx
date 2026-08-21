import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../../../attached_assets/logotrans-brand-800.webp";
import SiteFooter from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop/", label: "Shop" },
  { href: "/events/two-paws-pet-festival-2026", label: "Events" },
  { href: "/account", label: "Account" },
];

export default function EventShell({
  children,
  fullWidth = false,
  hideHeader = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
  hideHeader?: boolean;
}) {
  const { user, signOutUser } = useAuth();
  return (
    <div className="min-h-screen bg-white text-slate-950">
      {!hideHeader && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="rounded-lg border border-slate-200 p-2 text-brand-dark md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>TwoPaws</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-5">
                  {links.map((link) => (
                    <Link key={link.href} to={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" aria-label="TwoPaws home">
              <img src={logo} alt="TwoPaws" className="h-11 w-auto" />
            </Link>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="transition hover:text-brand-dark"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {user ? (
            <Button
              variant="outline"
              onClick={() => void signOutUser()}
              className="border-brand-dark text-brand-dark"
            >
              Sign out
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-brand-dark text-brand-dark">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          </div>
        </header>
      )}
      <main className={fullWidth ? "w-full" : "mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8"}>
        {children}
      </main>
      {!fullWidth && <SiteFooter />}
    </div>
  );
}
