"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useReducedMotionSafe } from "../lib/useReducedMotionSafe";
import Aperture from "./Aperture";
import RevealText from "./RevealText";
import { useScrollContext } from "../context/ScrollContext";

/**
 * Each section pins at the top of the viewport and the *next* one arrives over
 * it, so the previous page never leaves — it just gets covered.
 *
 * The arrival is the loading screen's gesture reused: the incoming section
 * rides up as a solid ink or paper panel, holds a beat, then the panel is eaten
 * away from the centre outward to uncover the footage underneath. Because the
 * aperture is driven by scroll position rather than time, scrolling back up
 * closes it again with the identical motion, for free.
 *
 * A section is either a link (the whole plate is clickable) or a plate with a
 * single explicit `cta` — never both, so there is only ever one thing to press.
 */
export default function StackSection({
  id,
  index,
  title,
  subtitle,
  media,
  poster,
  href,
  external,
  cta,
  panel,
  progressMV,
  nextProgressMV,
}: {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  media?: string;
  poster: string;
  /** Omit for a plate that is not itself a destination. */
  href?: string;
  external?: boolean;
  /** An explicit button on the plate, for sections that need a stated action. */
  cta?: { label: string; href: string };
  /** Which half of the two-tone system this section arrives on. */
  panel: "ink" | "paper";
  progressMV: MotionValue<number>;
  nextProgressMV: MotionValue<number>;
}) {
  const { containerRef } = useScrollContext();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // 0 while the section is still below the fold, 1 once it has arrived at the
  // top of the viewport at full bleed.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
    container: containerRef,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => progressMV.set(v));

  const [titleOn, setTitleOn] = useState(false);
  const [metaOn, setMetaOn] = useState(false);

  useEffect(() => {
    const recompute = () => {
      const e = scrollYProgress.get();
      const next = nextProgressMV.get();
      setTitleOn(e > 0.5 && !(next > 0.15));
      setMetaOn(e > 0.6 && !(next > 0.15));
    };
    recompute();
    const unsubA = scrollYProgress.on("change", recompute);
    const unsubB = nextProgressMV.on("change", recompute);
    return () => {
      unsubA();
      unsubB();
    };
  }, [scrollYProgress, nextProgressMV]);

  // The loader's three-step opening, scrubbed by scroll instead of a clock:
  // held shut while the panel rides up, then the hole widens sideways into a
  // letterbox, then it opens out. Scrolling back up closes it the same way.
  //
  // Reduced motion pins the panel open, so sections simply stack without the
  // masked reveal riding the scroll.
  const reduce = useReducedMotionSafe();
  const frames: [number, number, number, number, number] = [0, 0.3, 0.56, 0.72, 1];
  const sx = useTransform(
    scrollYProgress,
    frames,
    reduce ? [0, 0, 0, 0, 0] : [50, 50, 25, 5, 0],
  );
  const sy = useTransform(
    scrollYProgress,
    frames,
    reduce ? [0, 0, 0, 0, 0] : [50, 50, 35, 35, 0],
  );

  const panelColor =
    panel === "ink" ? "var(--color-ink)" : "var(--color-paper)";

  const plate = (
    <>
      {media ? (
        <video
          src={media}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* index, left edge */}
      <div className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <RevealText
          as="span"
          text={index}
          trigger={metaOn}
          className="font-[family-name:var(--font-body)] text-[13px] md:text-[16px]"
          style={{ color: "var(--color-paper)" }}
        />
      </div>

      {/* title, and the action under it when there is one */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[4dvh] px-6 text-center pointer-events-none">
        <RevealText
          as="h3"
          text={title}
          trigger={titleOn}
          className="font-[family-name:var(--font-body)] font-semibold uppercase text-[9vw] md:text-[5.5vw] leading-[0.95] tracking-[-0.02em]"
          style={{ color: "var(--color-paper)" }}
        />

        {cta && (
          <Link
            href={cta.href}
            // The plate itself is not a link here, so this is the only live
            // target — it has to take its pointer events back from the wrapper.
            // Colours live in classes, not inline styles, so the hover fill can
            // actually override them.
            // A filled button, not an outline. The outlined version was legible
            // only once you found it — it read as a border drawn over a photo
            // until you hovered, and on touch there is no hover at all. Solid
            // ink on this light plate carries its own contrast, so it reads as a
            // button before anything is pointed at it.
            //
            // `mt` sits it just below the title, a little tighter than the
            // column gap alone. Radius is deliberately small — softened, not
            // round. The bone outline is what lifts the fill off the photograph.
            // The box is the previous one × 1.04 on both axes, measured rather
            // than assumed. Type scales too, so the label grows with the button
            // instead of drifting inside it. The padding carries slightly more
            // than 4% because the 2px border does not scale — 2.08px is not
            // something a screen can draw — so it has to absorb that remainder
            // for the outer box to land on 4%.
            className="pointer-events-auto mt-[1.5dvh] inline-block rounded-[6px] border-2 border-[var(--color-bone)] bg-[var(--color-ink)] px-[25.4px] py-[14.9px] font-[family-name:var(--font-body)] text-[18.5px] md:text-[15.6px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-paper)] hover:bg-[var(--color-brass)]"
            style={{
              // Opens with the panel rather than sitting there through the
              // arrival, so the plate reads before the action does.
              opacity: metaOn ? 1 : 0,
              transform: metaOn ? "translateY(0)" : "translateY(12px)",
              // Static, not animated — a box-shadow keyframe would repaint on
              // the main thread every frame.
              boxShadow: "0 2px 12px color-mix(in srgb, #000 22%, transparent)",
              transition:
                "opacity 700ms cubic-bezier(0.19,1,0.22,1) 200ms, transform 700ms cubic-bezier(0.19,1,0.22,1) 200ms, background-color 300ms",
            }}
          >
            {cta.label}
          </Link>
        )}
      </div>

      {/* subtitle */}
      <div className="absolute bottom-[8dvh] left-0 right-0 z-10 flex justify-center px-6 pointer-events-none">
        <RevealText
          as="h4"
          text={subtitle}
          trigger={metaOn}
          delay={0.1}
          className="font-[family-name:var(--font-body)] text-[11px] md:text-[15px] uppercase tracking-[0.2em] leading-[1.3] text-center"
          style={{ color: "var(--color-paper)" }}
        />
      </div>
    </>
  );

  return (
    <div ref={sectionRef} id={id} className="sticky top-0 h-dvh w-full">
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="absolute inset-0 block overflow-hidden"
        >
          {plate}
        </a>
      ) : (
        <div className="absolute inset-0 overflow-hidden">{plate}</div>
      )}

      {/* The panel that opens. Sits over the footage and lets clicks through to
          whatever is underneath. */}
      <Aperture
        sx={sx}
        sy={sy}
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ backgroundColor: panelColor }}
      />
    </div>
  );
}
