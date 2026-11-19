import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import AccountActions from "@/components/layout/AccountActions";

type ShopShellProps = {
  children: ReactNode;
  headerContent?: ReactNode;
  /**
   * A bar pinned to the bottom of the screen on phones (e.g. Add to cart, or the checkout total).
   * The page gets matching bottom padding so the bar never hides the footer.
   */
  mobileBar?: ReactNode;
};

export default function ShopShell({ children, headerContent, mobileBar }: ShopShellProps) {
  return (
    <div className={`shop-skin clay-bg min-h-screen text-[#3d1f3a] ${mobileBar ? "pb-24 lg:pb-0" : ""}`}>
      <SiteHeader actions={<AccountActions />}>{headerContent}</SiteHeader>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-8 lg:px-12">
        {children}
      </main>

      <SiteFooter />

      {mobileBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#783F6A]/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(94,42,90,0.35)] backdrop-blur-md lg:hidden">
          {mobileBar}
        </div>
      ) : null}
    </div>
  );
}
