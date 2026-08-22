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
 * so the header arrives with the page rather than fading in over it — and it
 * goes back out the same way when a section needs the top of the screen to
 * itself. See `retracted`.
 */
function Drop({
  children,
  delay,
  ready,
  retracted,
}: {
  children: React.ReactNode;
  delay: number;
  ready: boolean;
  retracted: boolean;
}) {
  const shown = ready && !retracted;

  return (
    <span className="relative inline-block overflow-hidden pointer-events-auto">
      <motion.span
        className="inline-block"
        // Opacity is pinned at 1 for the arrival on purpose — the drop is a
        // clip reveal, not a fade, and animating both would soften the edge
        // that makes it read as the mark sliding out from behind the top of
        // the page. It only comes into play on the way out, where it is doing
        // a different job: `MotionConfig reducedMotion="user"` drops transform
        // animations, so for a visitor who has asked for less motion the `y`
        // below never runs and the mark would simply stay put — sitting on the
        // channel heading, which is the one thing this has to prevent. Opacity
        // survives that switch, so the retract still happens; it just fades
        // instead of lifting.
        initial={{ y: "-100%", opacity: 1 }}
        animate={{ y: shown ? "0%" : "-100%", opacity: retracted ? 0 : 1 }}
        transition={{
          // Leaving is quicker than arriving. The arrival is the page
          // introducing itself and can take its time; the retract is getting
          // out of the way of something already on its way in, and a slow exit
          // would still be crossing the heading when the heading lands.
          duration: retracted ? 0.55 : 0.9,
          ease: EASE,
          delay: shown ? delay : 0,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Header({
  ready = true,
  /**
   * Lift the mark back out of its clip window.
   *
   * The wordmark is fixed, centred and floats over the whole page, which is
   * exactly right over full-bleed footage and exactly wrong over a section
   * that sets its own type near the top of the screen: the channel's "Watch"
   * lands underneath it and the two read as one smudge. Ranging that heading
   * left buys clearance at most viewports but not all of them, and the mark has
   * nothing to say over a page of thumbnails anyway. So it leaves.
   */
  retracted = false,
}: {
  ready?: boolean;
  retracted?: boolean;
}) {
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
      <Drop delay={0.08} ready={ready} retracted={retracted}>
        <a
          href="#hero"
          onClick={toTop}
          aria-label="yrsaclicks — back to top"
          // Out of the clip window means out of reach as well as out of sight.
          // The span clips the paint, but a keyboard tab would still land on a
          // link nobody can see, so the link takes itself off the tab order and
          // out of the accessibility tree while it is away.
          aria-hidden={retracted}
          tabIndex={retracted ? -1 : undefined}
          className="block cursor-pointer opacity-100 transition-opacity duration-200 hover:opacity-60"
        >
          {/* The mark is about two and a half times as wide as it is tall, so a
              given width buys noticeably more height than the wide handwritten
              version did. These widths stay restrained for that reason — the
              lift over the previous set is in the artwork's proportions as much
              as in the numbers. */}
          <Logo className="w-[165px] md:w-[215px] lg:w-[250px]" />
        </a>
      </Drop>
    </header>
  );
}
