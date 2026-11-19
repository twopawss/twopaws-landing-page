import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { isReactSnapPrerender } from "@/lib/isPrerender";

const ease = [0.22, 1, 0.36, 1] as const;

const from = {
  up: { opacity: 0, y: 26 },
  left: { opacity: 0, x: -40 },
  right: { opacity: 0, x: 40 },
  pop: { opacity: 0, scale: 0.9, y: 16 },
} as const;

type RevealProps = {
  children: ReactNode;
  /** Where the content comes from as it scrolls into view. */
  variant?: keyof typeof from;
  delay?: number;
  className?: string;
  /** false slides without fading, so the content is readable even if the animation never runs. */
  fade?: boolean;
};

/**
 * Fades and slides its content in the first time it scrolls into view.
 * Stays still for reduced motion, and while the page is being prerendered so the saved HTML is fully visible.
 */
export default function Reveal({ children, variant = "up", delay = 0, className, fade = true }: RevealProps) {
  const still = (useReducedMotion() ?? false) || isReactSnapPrerender();
  const start = fade ? from[variant] : { ...from[variant], opacity: 1 };
  return (
    <motion.div
      className={className}
      initial={still ? false : start}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      // "some" rather than a fraction, so content taller than the screen still appears
      viewport={{ once: true, amount: "some", margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
