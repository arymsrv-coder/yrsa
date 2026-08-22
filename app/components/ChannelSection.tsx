"use client";

import { useEffect, useRef } from "react";
import { useScroll } from "framer-motion";
import Aperture from "./Aperture";
import VideoRows from "./VideoRows";
import { useScrollContext } from "../context/ScrollContext";
import { PIN_VH, TRACK_VH, useApertureScrub } from "../lib/arrival";
import { CHANNEL_URL, hasClips, snapshot } from "../lib/youtube";

/**
 * The channel, as the second plate of the landing page.
 *
 * This used to be a full-bleed photograph with a `Watch` button on it, and the
 * rows lived a click away on `/watch`. The photograph was doing the job of an
 * advertisement for a page — and the page it advertised was the thing worth
 * seeing. So the rows moved here and the plate came out: the work is now the
 * second thing the site shows you rather than the second thing it offers to
 * show you, and the visit no longer has a door in the middle of it.
 *
 * Paper, which is the other half of the two-tone system. The archive above
 * arrives on ink; this arriving on the same ink would read as one long plate
 * rather than a second thing.
 *
 * The arrival is the same aperture every other section arrives through — see
 * the track below. An ordinary scroll into paper was the one seam on the page
 * where a section simply slid into view, and next to a plate that opens out of
 * a box in the middle of the screen it read as the page having run out of ideas
 * rather than as a change of register.
 *
 * What the box opens onto is the rows themselves. It opened onto blank paper
 * first, with the work a screen below — which made the gesture an announcement
 * for a page rather than the page arriving, the same mistake the photograph
 * with the `Watch` button on it used to make. So the content is held still for
 * the length of the opening and uncovered in place.
 *
 * Held, not pinned in the plates' sense: the rows are only still while the
 * panel is coming off them, and the hold ends on the frame the aperture
 * finishes. That matters, because a row you scroll sideways inside a plate that
 * is itself being scrubbed by the scroll is two things fighting over one
 * gesture — so the rows become reachable at the exact moment they stop being
 * held, and never overlap.
 */
export default function ChannelSection({
  /**
   * Called with `true` once the arriving panel has the screen, and `false`
   * again on the way back up. The header's wordmark rides on this.
   */
  onTakesScreen,
}: {
  onTakesScreen?: (taken: boolean) => void;
}) {
  const { containerRef } = useScrollContext();
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // 0 while the track is still below the fold, 1 at the far end of it — panel
  // landed, aperture fully open. The same offsets `StackSection` measures its
  // plate with, against a track of the same height, which is what makes the two
  // arrivals one gesture rather than two that resemble each other.
  //
  // Measured against a rule of its own rather than against the section, because
  // the section is as tall as its content and the scrub has to be as long as
  // the arrival. The rule is `absolute`, so it is a measurement and not a box —
  // it adds nothing to the height it is measuring inside of.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start end", "end end"],
    container: containerRef,
  });

  const { sx, sy } = useApertureScrub(scrollYProgress);


  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !onTakesScreen) return;

    const io = new IntersectionObserver(
      ([entry]) => onTakesScreen(entry.isIntersecting),
      {
        // The page scrolls inside a container, not the document, so the
        // viewport for this purpose is that container — see `ScrollProvider`.
        root: containerRef.current,

        // Shrink the root to a strip at the very top of the screen, so this
        // fires as the panel finishes riding up rather than partway through.
        // The section is taller than the viewport and ends the page, so its
        // bottom never climbs above the top of the screen — which makes
        // "intersects the strip" exactly "the panel has landed", with no second
        // crossing to un-fire it. The mark then lifts away against solid ink,
        // during the beat before the aperture starts to open, and the channel
        // is uncovered onto a screen it no longer has to share.
        rootMargin: "0px 0px -95% 0px",
        threshold: 0,
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [containerRef, onTakesScreen]);

  // Belt and braces: the snapshot ships populated, but a build that fetched a
  // channel mid-deletion could empty it, and a heading over nothing is worse
  // than no section at all.
  if (!hasClips) return null;

  return (
    <section
      id="youtube"
      ref={sectionRef}
      // `z-10` puts it over the pinned plates, which is what lets it cover them
      // as it comes up rather than sliding underneath. The ground has to be
      // opaque for the same reason.
      className="relative z-10 w-full bg-[var(--color-paper)] text-[var(--color-ink)]"
    >
      {/* The arrival. Its only structural job is to be `PIN_VH` taller than the
          content inside it, which is the whole of what lets that content be
          held still — see the spacer at the foot of it. */}
      <div className="relative w-full">
        {/* The rule the opening is scrubbed against. No width, no content, and
            `absolute` so it measures the arrival without being part of it.
            `track-height` gives it the plates' unit as well as their number:
            this is scroll distance, and `svh` is the one viewport unit that
            does not move when a mobile browser slides its toolbar away. */}
        <div
          ref={trackRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 w-px track-height"
          style={{ "--track-vh": TRACK_VH * 100 } as React.CSSProperties}
        />

        {/* The panel, on a sticky anchor of no height at all.

            Zero-height so it does not displace the content below it, and sticky
            so that it rides up with the page and then pins to the top of the
            screen — the plates get both from being a screen-tall sticky plate,
            which is not available here because what is behind this one is
            taller than a screen.

            The panel is ink and not paper. Every other panel wears the colour
            of the section it belongs to, and by that rule this one would be
            paper — but paper retreating off paper is a move nobody can see, and
            the box in the middle of the screen is the whole of the gesture. Ink
            is the curtain, not the section: the two-tone alternation is intact
            underneath it, because what the curtain opens onto is the page's
            other colour. */}
        <div data-arrival="channel" className="sticky top-0 z-20 h-0">
          <Aperture
            sx={sx}
            sy={sy}
            color="var(--color-ink)"
            className="pointer-events-none absolute left-0 top-0 h-dvh w-full"
          />
        </div>

        {/* Held still under the panel, then released on the frame the aperture
            finishes.

            Reachable throughout, including the stretch where the panel is over
            it. That is deliberate, and it is what the plates do too — their
            button is behind their panel during the ride. Taking the pointer
            events away for the covered stretch was tried and is a bad trade: it
            has to be driven off the scrub, and anything that reaches this
            section without the scrub having reported a value — scroll
            restoration on reload, an in-page anchor, a browser scrolling an
            element into view — leaves every tile, chevron and link in the
            section inert. A stray tap on a covered thumbnail is a smaller
            problem than a channel nobody can click. A sticky child is pushed by the bottom of its containing
            block, so once the hold below has been spent this comes to rest
            flush with the foot of the section — which is why holding it costs
            the page a screen of scroll and not a screen of empty paper. */}
        <div className="sticky top-0 z-0">
          <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-20 lg:px-10 lg:pt-24">
            {/* Ranged left, unlike the plates above, which centre their titles.
            Not a stylistic preference — the header's wordmark is fixed, centred
            and floats over everything, and this section is the one place a
            heading of our own sits near the top of the screen at rest. Centred,
            "Watch" lands underneath the mark and the two read as one smudge;
            no amount of top padding fixes it, because the page comes to rest
            with this section's top off-screen. Ranged left it clears the mark
            at every viewport, and it lines up with the row labels below it,
            which were already left.

            The mark now lifts away before this arrives, so the clash it was
            avoiding is gone twice over. The ranging stays: it is the right
            setting for a heading that shares an edge with the row labels, and
            the retract is a moving part that this should not depend on. */}
            <div className="mb-9">
              <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-[0.2em] opacity-80 md:text-[13px]">
                02 — The channel
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-body)] text-[11vw] font-semibold uppercase leading-[0.95] tracking-[-0.02em] md:text-[4vw]">
                Watch
              </h2>
            </div>

            <VideoRows shorts={snapshot.shorts} videos={snapshot.videos} />

            <div className="mt-14 text-center">
              {/* Deliberately not sharing `StackSection`'s button class. That one
              sits on a photograph and needs the devices that lift it off one —
              a bone outline and a drop shadow. Both are wasted on paper: bone
              against paper is very nearly the same colour, and a shadow with no
              picture under it is decoration. Same size and weight, fewer
              tricks. */}
              <a
                href={CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-[14px] bg-[var(--color-brass)] px-[34px] py-[19px] font-[family-name:var(--font-body)] text-[13px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-paper)] transition-colors duration-300 hover:bg-[var(--color-brass-deep)] md:text-[15px]"
              >
                Full archive on YouTube
              </a>
            </div>
          </div>
        </div>

        {/* The hold itself: the only thing in the section that is not content.
            It is never seen — the content above is pushed down over it as the
            hold is spent, and comes to rest covering it exactly. */}
        <div
          aria-hidden
          className="arrival-hold w-full"
          style={{ "--pin-vh": PIN_VH * 100 } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
