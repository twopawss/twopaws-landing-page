import type { ReactNode } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import SiteFooter from "@/components/layout/SiteFooter";
import { LOGO_SRC } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop/", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
];

type ShopShellProps = {
  children: ReactNode;
  headerContent?: ReactNode;
};

export default function ShopShell({ children, headerContent }: ShopShellProps) {
  const { user, userDisplayName, signOutUser } = useAuth();
  const { cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;
  const userLabel = userDisplayName || user?.email?.split("@")[0] || "Account";
  const userEmail = user?.email || "Signed in user";
  const userInitial = userLabel.charAt(0).toUpperCase();
  const compactUserLabel = userLabel.split(" ")[0] || userLabel;

  return (
    <div className="clay-bg min-h-screen text-slate-900">
      <header className="border-b border-[#783F6A]/10 bg-white text-[#783F6A]">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 sm:gap-10">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#783F6A]/25 text-[#783F6A] md:hidden"
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
                  {navLinks.map((link) => (
                    <Link key={link.href} to={link.href} className="hover:text-brand-green-dark">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/shop/" className="flex items-center gap-2">
              <img src={LOGO_SRC} alt="TwoPaws" width={900} height={172} className="h-8 w-auto sm:h-9" />
            </Link>
            <nav className="hidden items-center gap-8 text-[15px] md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="transition-opacity hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
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
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex max-w-[132px] items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 text-left hover:border-brand-green-dark sm:max-w-none"
                    aria-label="Open account menu"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-dark">
                      {userInitial}
                    </span>
                    <span className="hidden max-w-[72px] truncate text-xs font-medium text-slate-700 min-[420px]:block sm:hidden">
                      {compactUserLabel}
                    </span>
                    <span className="hidden max-w-[160px] sm:block">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {userLabel}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-64">
                  <DropdownMenuLabel className="space-y-0.5">
                    <p className="truncate text-sm font-medium text-slate-900">{userLabel}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs text-slate-500 focus:text-slate-700"
                    onSelect={() => {
                      void signOutUser();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="font-display bg-[#783F6A] text-[15px] text-white hover:bg-[#6a365d]">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
        {headerContent ? (
          <div className="mx-auto w-full max-w-[1500px] border-t border-[#783F6A]/10 px-4 py-3 sm:px-8 lg:px-12">
            {headerContent}
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-8 lg:px-12">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
