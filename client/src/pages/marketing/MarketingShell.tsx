import ClayProp from "@/components/motion/ClayProp";
import { Children, isValidElement, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/motion/Reveal";
import Seo from "@/lib/seo/Seo";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";

type MarketingShellProps = {
  children: ReactNode;
};

/** Shell for the text pages: shared header, a strip of the park under a blue sky, then the page content. */
export default function MarketingShell({ children }: MarketingShellProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollY } = useScroll();
  const bgX = useTransform(scrollY, [0, 900], [0, -70]);
  const fgX = useTransform(scrollY, [0, 900], [0, -190]);
  return (
    <div className="clay-bg min-h-screen text-slate-900">
      <SiteHeader />

      <div
        aria-hidden
        className="relative h-40 overflow-hidden sm:h-52"
        style={{ background: "linear-gradient(#7CC4F2, #BDE2FA)" }}
      >
        <motion.img
          src="/clay/park-bg.webp"
          alt=""
          className="absolute bottom-0 left-0 h-[150%] w-auto max-w-none select-none"
          draggable={false}
          style={reducedMotion ? undefined : { x: bgX }}
        />
        <motion.img
          src="/clay/park-fg.webp"
          alt=""
          className="absolute bottom-0 left-0 h-[150%] w-auto max-w-none select-none"
          draggable={false}
          style={reducedMotion ? undefined : { x: fgX }}
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#fdf6fa] to-transparent" />
      </div>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-20 pt-10 [&_h1]:text-[clamp(2.4rem,5vw,3.6rem)] [&_h1]:font-bold [&_h1]:leading-[1.05]">
        <ClayProp name="paw" className="-top-10 right-4 hidden w-24 md:block lg:-right-6 lg:w-28" tilt={10} />
        {Children.toArray(children).map((child, i) =>
          // the SEO tags render nothing, so wrapping them would only add an empty gap
          isValidElement(child) && child.type !== Seo ? (
            <Reveal key={i} delay={Math.min(i, 3) * 0.08}>
              {child}
            </Reveal>
          ) : (
            child
          ),
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
