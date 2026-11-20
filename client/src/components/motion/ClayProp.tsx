import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type ClayPropProps = {
  name: "paw" | "bone" | "ball" | "bowl" | "letter" | "gift" | "heart";
  /** Position and width, e.g. "right-[4%] top-10 w-28". */
  className?: string;
  /** Resting tilt in degrees. */
  tilt?: number;
  /** How far, in pixels, it drifts against the scroll. */
  drift?: number;
};

/** A small clay object that floats gently and drifts and turns as the page scrolls past it. */
export default function ClayProp({ name, className = "", tilt = 0, drift = 70 }: ClayPropProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-10, 10]);

  return (
    <motion.div ref={ref} aria-hidden className={`clay-prop ${className}`} style={reducedMotion ? undefined : { y, rotate }}>
      <img src={`/clay/prop-${name}.webp`} alt="" loading="lazy" style={{ ["--clay-tilt" as string]: `${tilt}deg` }} />
    </motion.div>
  );
}
