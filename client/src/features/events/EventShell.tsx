import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import AccountActions from "@/components/layout/AccountActions";

export default function EventShell({
  children,
  fullWidth = false,
  hideHeader = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      {!hideHeader && <SiteHeader actions={<AccountActions />} />}
      <main className={fullWidth ? "w-full" : "mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8"}>
        {children}
      </main>
      {!fullWidth && <SiteFooter />}
    </div>
  );
}
