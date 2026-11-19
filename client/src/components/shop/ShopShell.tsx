import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import AccountActions from "@/components/layout/AccountActions";

type ShopShellProps = {
  children: ReactNode;
  headerContent?: ReactNode;
};

export default function ShopShell({ children, headerContent }: ShopShellProps) {
  return (
    <div className="clay-bg min-h-screen text-slate-900">
      <SiteHeader actions={<AccountActions />}>{headerContent}</SiteHeader>

      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-8 lg:px-12">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
