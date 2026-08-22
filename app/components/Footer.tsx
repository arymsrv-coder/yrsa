"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import HoverRoll from "./HoverRoll";
import { useScrollContext } from "../context/ScrollContext";

/**
 * One class for both social links, so the two cannot drift apart.
 *
 * The padding is the point of it. These links were 27px tall, and a touch
 * target has to be 44 to be reliably hittable with a thumb. `HoverRoll` cancels
 * its own clip padding with a negative margin, so the box can grow out here
 * without the roll or the label changing at all.
 */
const SOCIAL_CLASS =
  "py-3 font-[family-name:var(--font-body)] uppercase tracking-[0.14em] text-[12px] md:text-[14px]";

/**
 * The footer's contents are parked well above their resting place and fall into
 * it as the block scrolls up, so the type lags behind the panel it sits on and
 * the last screen settles rather than simply arriving.
 */
export default function Footer({
  // `#members` is a section on the landing page and nothing at all anywhere
  // else, so subpages pass their own target rather than shipping a dead anchor.
  creditsHref = "#members",
}: {
  creditsHref?: string;
}) {
  const { containerRef } = useScrollContext();
  const ref = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
    container: containerRef,
  });

  const lead = useTransform(scrollYProgress, [0, 1], ["-60vh", "0vh"]);
  const trail = useTransform(scrollYProgress, [0, 1], ["-24vh", "0vh"]);

  return (
    <footer
      ref={ref}
      id="footer"
      style={{
        backgroundColor: "var(--color-ink)",
        color: "var(--color-paper)",
      }}
      className="relative z-10 w-full overflow-hidden px-5 lg:px-10 pt-14 pb-6 flex flex-col gap-10"
    >
      <motion.div
        style={{ y: lead }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center"
      >
        <div className="flex flex-col gap-2 items-center">
          <span className="font-[family-name:var(--font-body)] font-bold uppercase tracking-[0.1em] text-[22px] md:text-[30px]">
            Contacts
          </span>
          <HoverRoll
            href="https://instagram.com/yrsaclicks"
            external
            text="dm @yrsaclicks"
            className={SOCIAL_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <span className="font-[family-name:var(--font-body)] font-bold uppercase tracking-[0.1em] text-[22px] md:text-[30px]">
            Follow
          </span>
          <HoverRoll
            href="https://instagram.com/yrsasjourney"
            external
            text="@yrsasjourney"
            className={SOCIAL_CLASS}
          />
        </div>
      </motion.div>

      {/* oversized wordmark, edge to edge */}
      <motion.span
        style={{ y: trail }}
        className="block w-full text-center whitespace-nowrap font-[family-name:var(--font-body)] font-extrabold uppercase leading-[0.8] tracking-[-0.035em] text-[13vw]"
      >
        yrsaclicks
      </motion.span>

      <div className="flex justify-between items-end py-2 font-[family-name:var(--font-body)] uppercase tracking-[0.12em] text-[10px] md:text-[12px]">
        <span>© 2026 yrsaclicks</span>
        <HoverRoll href={creditsHref} text="credits" className="py-3" />
      </div>
    </footer>
  );
}
