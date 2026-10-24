import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import CartBadge from "@/components/shop/CartBadge";
import { SignedOutActions } from "@/components/layout/SiteHeader";

/**
 * Header controls for pages under FirebaseShell: live cart count and the account menu.
 * Needs AuthProvider and a cart provider, so landing and marketing pages must not render it.
 */
export default function AccountActions() {
  const { user, userDisplayName, signOutUser } = useAuth();
  const userLabel = userDisplayName || user?.email?.split("@")[0] || "Account";
  const userInitial = userLabel.charAt(0).toUpperCase();
  const compactUserLabel = userLabel.split(" ")[0] || userLabel;

  return (
    <>
      <CartBadge />
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
                <span className="block truncate text-sm font-medium text-slate-900">{userLabel}</span>
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
            <DropdownMenuItem asChild>
              <Link to="/account/event-orders">Event tickets</Link>
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
        <SignedOutActions />
      )}
    </>
  );
}
