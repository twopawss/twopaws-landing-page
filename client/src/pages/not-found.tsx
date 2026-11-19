import ClayProp from "@/components/motion/ClayProp";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import Seo from "@/lib/seo/Seo";

export default function NotFound() {
  return (
    <div className="clay-bg flex min-h-screen flex-col">
      <Seo
        title="Page not found | TwoPaws"
        description="The page you requested could not be found."
        canonicalUrl="/"
        noIndex
      />
      <SiteHeader />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 pb-20 pt-16">
        <ClayProp name="bone" className="right-6 top-10 w-28 sm:w-36" tilt={-8} />
        <p className="font-display text-sm font-medium uppercase tracking-[0.14em] text-[#783F6A]">Error 404</p>
        <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.05]">
          This page wandered <span className="bg-[linear-gradient(transparent_58%,#FEC329_58%,#FEC329_92%,transparent_92%)] px-[0.06em]">off</span>
        </h1>
        <p className="font-display mt-4 max-w-md text-lg text-[#6B3566]">
          The page may have moved, or the URL might be incorrect. Head back home and try again from there.
        </p>
        <a
          href="/"
          className="font-display mt-8 inline-flex h-12 items-center rounded-full bg-[#783F6A] px-7 text-[17px] font-medium text-white transition-transform hover:-translate-y-0.5"
        >
          Back to home
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
