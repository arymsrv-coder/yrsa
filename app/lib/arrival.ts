"use client";

import { useTransform, type MotionValue } from "framer-motion";
import { APERTURE_SHUT, APERTURE_STEPS } from "./motion";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

/**
 * How a section arrives, in viewport heights, and how that scroll is spent.
 *
 * This is the pace control for every arrival on the page. The transition is
 * scrubbed by scroll *position*, so its speed is set by distance — not by any
 * duration — and it used to have exactly one viewport to play across, because a
 * section was one viewport tall and that was all the travel there was. On a
 * wheel that read as deliberate, since one notch moves a tenth of a screen.
 * Under a thumb it was over in a flick.
 *
 * `RIDE_VH` is not a free choice: the panel has to cross one screen to arrive,
 * and the layout fixes that. So the room has to be bought for the part that was
 * actually being skipped — the opening — which is why a section now pins on
 * arrival and the panel comes away against a still frame.
 *
 * Shared rather than owned by `StackSection` because the channel arrives the
 * same way and must arrive at the same speed. Two sections opening with the
 * same gesture at different rates would read as two gestures.
 */
export const RIDE_VH = 1;

/**
 * The beat between the panel landing and it starting to come away.
 *
 * It also has to absorb a discrepancy: a track is measured in `svh` and a plate
 * in `dvh`, so the plate pins slightly later in the scrub when a mobile browser
 * has hidden its toolbar — 0.49 of the way along with the toolbar out, a couple
 * of points further without it, against an opening that starts at 0.56. The
 * beat has to be longer than that drift or the panel would begin opening while
 * it was still travelling. `tests/scroll-pacing.mjs` measures both points and
 * checks they are still in that order.
 */
export const HOLD_VH = 0.15;

/** Scroll given to the three-stage opening itself. */
export const OPEN_VH = 0.9;

export const TRACK_VH = RIDE_VH + HOLD_VH + OPEN_VH;

/**
 * The part of the track a section has to be held still for.
 *
 * The ride is spent travelling, and whatever is behind the panel during it is
 * covered anyway. Everything after the panel lands is the section standing
 * there being uncovered, so that is the stretch it must not move through — the
 * plates get it from `sticky` on a plate that is exactly one screen tall, and
 * the channel, whose content is taller than a screen, has to buy it.
 */
export const PIN_VH = HOLD_VH + OPEN_VH;

/** Where in the scrub the panel begins to come away. */
export const OPEN_AT = (RIDE_VH + HOLD_VH) / TRACK_VH;

/** Place a fraction of the opening on a section's own 0–1 scrub. */
export const intoOpening = (t: number) => OPEN_AT + t * (1 - OPEN_AT);

/**
 * The loader's three-step opening, scrubbed by scroll instead of a clock: held
 * shut while the panel rides up, then the hole widens sideways into a
 * letterbox, then it opens out. Scrolling back up closes it the same way.
 *
 * The stops come straight from `APERTURE_STEPS`, remapped onto the part of the
 * scrub that happens after the panel has landed, with one extra stop in front
 * holding it shut through the ride-up. They used to be written out by hand and
 * had drifted a little off the shared numbers; deriving them is what makes "the
 * loader and the scroll are the same animation" literally true.
 *
 * Reduced motion pins the panel open, so sections simply stack without the
 * masked reveal riding the scroll.
 */
export function useApertureScrub(progress: MotionValue<number>) {
  const reduce = useReducedMotionSafe();
  const frames = [0, ...APERTURE_STEPS.t.map(intoOpening)];
  const shut = frames.map(() => 0);

  const sx = useTransform(
    progress,
    frames,
    reduce ? shut : [APERTURE_SHUT, ...APERTURE_STEPS.x],
  );
  const sy = useTransform(
    progress,
    frames,
    reduce ? shut : [APERTURE_SHUT, ...APERTURE_STEPS.y],
  );

  return { sx, sy };
}
