"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { APERTURE_SHUT, APERTURE_STEPS } from "../lib/motion";

/**
 * How much scrolling the section asks for, in viewport heights, and how it is
 * spent.
 *
 * This is the pace control for the whole arrival. The transition is scrubbed by
 * scroll *position*, so its speed is set by distance — not by any duration —
 * and it used to have exactly one viewport to play across, because a section was
 * one viewport tall and that was all the travel there was. On a wheel that read
 * as deliberate, since one notch moves a tenth of a screen. Under a thumb it was
 * over in a flick.
 *
 * `RIDE` is not a free choice: the plate has to cross one screen to arrive, and
 * the layout fixes that. So the room has to be bought for the part that was
 * actually being skipped — the opening — which is why the plate now pins on
 * arrival and the panel comes away against a still frame.
 */
const RIDE_VH = 1;
/**
 * The beat between the plate landing and the panel starting to go.
 *
 * It also has to absorb a discrepancy: the track is measured in `svh` and the
 * plate in `dvh`, so the plate pins slightly later in the scrub when a mobile
 * browser has hidden its toolbar — 0.49 of the way along with the toolbar out,
 * a couple of points further without it, against an opening that starts at 0.56.
 * The beat has to be longer than that drift or the panel would begin opening
 * while the plate was still travelling. `tests/scroll-pacing.mjs` measures both
 * points and checks they are still in that order.
 */
const HOLD_VH = 0.15;
/** Scroll given to the three-stage opening itself. */
const OPEN_VH = 0.9;
const TRACK_VH = RIDE_VH + HOLD_VH + OPEN_VH;

/** Where in the scrub the panel begins to come away. */
const OPEN_AT = (RIDE_VH + HOLD_VH) / TRACK_VH;

/** Place a fraction of the opening on the section's own 0–1 scrub. */
const intoOpening = (t: number) => OPEN_AT + t * (1 - OPEN_AT);

/**
 * The plate's button.
 *
 * A filled button, not an outline. The outlined version was legible only once
 * you found it — it read as a border drawn over a photo until you hovered, and
 * on touch there is no hover at all.
 *
 * Brass, not ink. Ink was the same green as the panel that had just opened and
 * as the header mark, so on a pale plate the button read as more of the
 * furniture. Brass is the one warm colour in the system and the only thing on a
 * plate wearing it, which is what makes it the thing to press. Hover deepens
 * rather than lightens — see --color-brass-deep for why that direction is the
 * only one available.
 *
 * The box grew faster than the label: roughly a third more padding against a
 * couple of points of type, because what was wanted was presence rather than a
 * louder word. Radius is up from 6px — softened further, still not a pill; a
 * fully round end would read as a web button rather than a plate. The bone
 * outline is what lifts the fill off the photograph.
 *
 * A module constant because two elements wear it: an internal route renders as
 * a `Link` and an off-site destination as a plain anchor, and the two must be
 * indistinguishable. Colours live in classes, not inline styles, so the hover
 * fill can actually override them.
 */
const CTA_CLASS =
  "pointer-events-auto inline-block rounded-[14px] border-2 border-[var(--color-bone)] bg-[var(--color-brass)] px-[34px] py-[19px] font-[family-name:var(--font-body)] text-[20px] md:text-[17px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-paper)] hover:bg-[var(--color-brass-deep)]";

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
  focus = "top",
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
  /**
   * An explicit button on the plate, for sections that need a stated action.
   * `external` sends it off-site in a new tab, the same way `href`/`external`
   * do for a whole-plate link.
   */
  cta?: { label: string; href: string; external?: boolean };
  /** Which half of the two-tone system this section arrives on. */
  panel: "ink" | "paper";
  /**
   * Where the crop holds when a portrait still is poured into a landscape
   * plate. Defaults to the top, which is what a standing figure shot close
   * usually wants; `center` is for a still that has its subject further down the
   * frame with something above them worth keeping.
   */
  focus?: "top" | "center";
  progressMV: MotionValue<number>;
  nextProgressMV: MotionValue<number>;
}) {
  const { containerRef } = useScrollContext();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // 0 while the section is still below the fold, 1 at the far end of its track —
  // plate landed, panel fully open.
  //
  // Measured to the track's *end* rather than its start. `start start` used to be
  // the same moment as the plate arriving, because the section had no track and
  // arriving was all it did. Now the plate pins at `start start` and the opening
  // plays out over the rest, so that is where the scrub begins, not where it ends.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
    container: containerRef,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => progressMV.set(v));

  const [titleOn, setTitleOn] = useState(false);
  const [metaOn, setMetaOn] = useState(false);

  useEffect(() => {
    const recompute = () => {
      const e = scrollYProgress.get();
      const next = nextProgressMV.get();
      // Expressed against the opening rather than the whole scrub, so the type
      // still lands at the same point of the reveal it always did — a little
      // after the hole starts widening, and the rest just behind it.
      setTitleOn(e > intoOpening(0.29) && !(next > 0.15));
      setMetaOn(e > intoOpening(0.43) && !(next > 0.15));
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
  // The stops come straight from APERTURE_STEPS now, remapped onto the part of
  // the scrub that happens after the plate has landed, with one extra stop in
  // front holding the panel shut through the ride-up. They used to be written out
  // by hand and had drifted a little off the shared numbers; deriving them is
  // what makes "the loader and the scroll are the same animation" literally true.
  const reduce = useReducedMotionSafe();
  const frames = [0, ...APERTURE_STEPS.t.map(intoOpening)];
  const shut = frames.map(() => 0);
  const sx = useTransform(
    scrollYProgress,
    frames,
    reduce ? shut : [APERTURE_SHUT, ...APERTURE_STEPS.x],
  );
  const sy = useTransform(
    scrollYProgress,
    frames,
    reduce ? shut : [APERTURE_SHUT, ...APERTURE_STEPS.y],
  );

  const panelColor =
    panel === "ink" ? "var(--color-ink)" : "var(--color-paper)";

  // The part of the button's styling that moves. Kept out of CTA_CLASS because
  // it depends on the reveal, and shared so the internal and off-site renders
  // below cannot drift apart.
  const ctaStyle: React.CSSProperties = {
    // Opens with the panel rather than sitting there through the arrival, so
    // the plate reads before the action does.
    opacity: metaOn ? 1 : 0,
    transform: metaOn ? "translateY(0)" : "translateY(12px)",
    // Static, not animated — a box-shadow keyframe would repaint on the main
    // thread every frame.
    boxShadow: "0 2px 12px color-mix(in srgb, #000 22%, transparent)",
    transition:
      "opacity 700ms cubic-bezier(0.19,1,0.22,1) 200ms, transform 700ms cubic-bezier(0.19,1,0.22,1) 200ms, background-color 300ms",
  };

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
        <Image
          src={poster}
          alt=""
          fill
          sizes="100vw"
          // A portrait still inside a plate that is landscape on a desktop and
          // portrait on a phone, so one of the two always crops hard and which
          // end it keeps has to be a per-section choice.
          //
          // Top is the default and what a studio shot of a standing figure
          // wants: on a wide screen a centred crop lands on her torso and takes
          // her face off the top of the frame. A still with headroom — sky above
          // her, the subject sitting lower — wants the opposite, because
          // holding the top there fills the plate with empty sky and drops the
          // title straight onto her face.
          className={`object-cover ${
            focus === "center" ? "object-center" : "object-top"
          }`}
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

      {/* The title, and the action directly under it when there is one.
          One group, centred as a group: the button belongs to the title and has
          to read that way, so the gap between them is a little over two
          viewport-hundredths and nothing else sits between. It used to be four
          plus a margin, which left enough air on a tall screen that the button
          looked like a separate thing further down the plate rather than the
          next line of the same thought. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[2.2dvh] px-6 text-center pointer-events-none">
        <RevealText
          as="h3"
          text={title}
          trigger={titleOn}
          className="font-[family-name:var(--font-body)] font-semibold uppercase text-[9vw] md:text-[5.5vw] leading-[0.95] tracking-[-0.02em]"
          style={{ color: "var(--color-paper)" }}
        />

        {cta &&
          // The plate itself is not a link here, so the button is the only live
          // target — it has to take its pointer events back from the wrapper.
          //
          // Off-site goes through a plain anchor rather than a `Link`.
          // next/link is for prefetching and client-navigating a route inside
          // this app, and neither applies to YouTube; a bare anchor is also the
          // one thing that reliably survives Instagram's in-app browser, which
          // is where much of this traffic arrives from. New tab, because unlike
          // the members route this is not where the site ends — there is still
          // something here to come back to.
          (cta.external ? (
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_CLASS}
              style={ctaStyle}
            >
              {cta.label}
            </a>
          ) : (
            <Link href={cta.href} className={CTA_CLASS} style={ctaStyle}>
              {cta.label}
            </Link>
          ))}
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
    // The track. It holds no content and is never seen — its only job is to be
    // tall, so that there is scrolling for the opening to be scrubbed across.
    // The plate below rides up through it and then pins for the rest of it.
    <div
      ref={sectionRef}
      id={id}
      className="relative w-full track-height"
      // `svh`, not `dvh`, and this is the one place in the site that wants the
      // difference. `dvh` tracks the viewport as a mobile browser slides its
      // toolbar in and out, which is right for the plate — it should always be
      // full bleed — but wrong for the track, because the track's height *is* the
      // scroll distance. A toolbar sliding away mid-scroll would relayout the
      // track, change the total, and jump the scrub the opening is riding on.
      // `svh` is the toolbar-visible height and never moves.
      //
      // Set as a custom property rather than a `Xsvh` string: a custom property's
      // value is never parsed, so it can't be dropped as invalid on browsers that
      // predate `svh` the way a literal unit would be. `track-height` (globals.css)
      // reads it back with `vh` as the default unit and upgrades to `svh` only
      // inside an `@supports` check, so those browsers still get a track sized to
      // *some* viewport unit instead of collapsing to zero height and taking the
      // rest of the scroll-scrubbed opening down with it.
      style={{ "--track-vh": TRACK_VH * 100 } as React.CSSProperties}
    >
      <div className="sticky top-0 h-dvh w-full">
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
          color={panelColor}
          className="absolute inset-0 z-20 pointer-events-none"
        />
      </div>
    </div>
  );
}
