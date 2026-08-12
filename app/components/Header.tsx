"use client";

import { motion } from "framer-motion";
import Logo from "./Logo";
import { EASE } from "../lib/motion";
import { useScrollContext } from "../context/ScrollContext";

/**
 * The mark alone, centred at the top. `mix-blend-difference` keeps it legible
 * over whatever footage is running underneath.
 *
 * It drops in from above its own clip window as the loading panel hands over,
 * so the header arrives with the page rather than fading in over it.
 */
function Drop({
  children,
  delay,
  ready,
}: {
  children: React.ReactNode;
  delay: number;
  ready: boolean;
}) {
  return (
    <span className="relative inline-block overflow-hidden pointer-events-auto">
      <motion.span
        className="inline-block"
        initial={{ y: "-100%" }}
        animate={{ y: ready ? "0%" : "-100%" }}
        transition={{ duration: 0.9, ease: EASE, delay: ready ? delay : 0 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Header({ ready = true }: { ready?: boolean }) {
  const { lenis } = useScrollContext();

  // Back to the hero. Goes through lenis when it is running so the return
  // matches the site's own scrolling rather than jumping.
  const toTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className="fixed top-[20px] lg:top-[28px] left-0 w-full z-[150] px-4 lg:px-10 flex justify-center items-start pointer-events-none mix-blend-difference"
      style={{ color: "var(--color-paper)" }}
    >
      <Drop delay={0.08} ready={ready}>
        <a
          href="#hero"
          onClick={toTop}
          aria-label="yrsaclicks — back to top"
          className="block cursor-pointer opacity-100 transition-opacity duration-200 hover:opacity-60"
        >
          {/* The handwritten mark is nearly four times as wide as it is tall, so
              a given width buys far less height than the old wordmark did — and
              it spells the whole name rather than four letters. These widths are
              deliberately restrained. */}
          <Logo className="w-[150px] md:w-[200px] lg:w-[230px]" />
        </a>
      </Drop>
    </header>
  );
}
