"use client";

import VideoRows from "./VideoRows";
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
 * Not pinned. Every section above it is a `sticky` plate scrubbed by scroll
 * position, and this is deliberately not — a row you scroll sideways inside a
 * plate that is itself being scrubbed by the scroll is two things fighting over
 * one gesture. It scrolls up over the pinned stack as ordinary content and
 * comes to rest, which is also what makes it the end of the page.
 */
export default function ChannelSection() {
  // Belt and braces: the snapshot ships populated, but a build that fetched a
  // channel mid-deletion could empty it, and a heading over nothing is worse
  // than no section at all.
  if (!hasClips) return null;

  return (
    <section
      id="youtube"
      // `z-10` puts it over the pinned plates, which is what lets it cover them
      // as it comes up rather than sliding underneath. The ground has to be
      // opaque for the same reason.
      className="relative z-10 w-full bg-[var(--color-paper)] text-[var(--color-ink)]"
    >
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-24 lg:px-10 lg:pt-28">
        {/* Ranged left, unlike the plates above, which centre their titles.
            Not a stylistic preference — the header's wordmark is fixed, centred
            and floats over everything, and this section is the one place a
            heading of our own sits near the top of the screen at rest. Centred,
            "Watch" lands underneath the mark and the two read as one smudge;
            no amount of top padding fixes it, because the page comes to rest
            with this section's top off-screen. Ranged left it clears the mark
            at every viewport, and it lines up with the row labels below it,
            which were already left. */}
        <div className="mb-9">
          <p className="font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-[0.2em] opacity-60 md:text-[13px]">
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
    </section>
  );
}
