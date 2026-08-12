/**
 * One motion vocabulary for the whole site.
 *
 * Everything that opens, closes, rises or settles uses these curves and the
 * aperture below, so the loading screen and the scroll read as the same gesture
 * at different speeds.
 */

/** Slow in, slow out, fast middle (easeInOutQuint). The signature curve. */
export const EASE: [number, number, number, number] = [0.83, 0, 0.17, 1];

/** Fast out, long settle (easeOutExpo). For hover rolls and arrivals. */
export const EASE_OUT: [number, number, number, number] = [0.19, 1, 0.22, 1];

/**
 * Counter run time, and the window the opening reel plays across. The header
 * and hero text start revealing the moment this elapses — while the panel is
 * still opening — so content lands well before the aperture has finished.
 */
export const LOAD_MS = 3400;

/**
 * The aperture.
 *
 * Four half-panel gradients — one per edge — are `add`-composited into a single
 * mask. Opposite edges are locked together, so there are only two numbers:
 * `sy` drives the top and bottom bands, `sx` the left and right. At 50/50 the
 * four bands tile the element exactly and it is a solid wall; as the numbers
 * fall each band retreats to its own edge and what is left is a frame that
 * thins to nothing.
 *
 * The two axes are deliberately out of step — horizontal opens further and
 * earlier than vertical — so the hole widens into a letterbox before it opens
 * out. That asymmetry is the whole character of the move; a symmetric version
 * just reads as a growing rectangle.
 *
 * It masks rather than moves, so nothing reflows, and driving the numbers from
 * scroll instead of time plays the entire sequence backwards for free.
 */
export const APERTURE_SHUT = 50;

/**
 * The three-step opening, as fractions of the whole run. Keyframe pairs are
 * shared by the loader (played on a clock) and the sections (scrubbed by
 * scroll) so the two are literally the same animation.
 */
export const APERTURE_STEPS = {
  /** normalised time */
  t: [0, 0.38, 0.62, 1],
  /** left/right bands */
  x: [50, 25, 5, 0],
  /** top/bottom bands */
  y: [50, 35, 35, 0],
} as const;

/** How long the loader's aperture takes end to end. */
export const APERTURE_S = 1.9;

/**
 * The same opening, for elements that are clipped rather than masked — the
 * frames of the loading reel. Identical numbers, so a frame opening inside the
 * strip and the panel opening across the viewport are visibly one gesture at
 * two scales.
 */
export const APERTURE_CLIP = APERTURE_STEPS.x.map(
  (x, i) =>
    `inset(${APERTURE_STEPS.y[i]}% ${x}% ${APERTURE_STEPS.y[i]}% ${x}%)`,
);

export const APERTURE_TIMES = [...APERTURE_STEPS.t];

/** Static style companions to the mask — it needs all of these to composite. */
export const APERTURE_STYLE = {
  maskRepeat: "no-repeat",
  maskSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%",
  maskComposite: "add",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%",
  WebkitMaskComposite: "source-over",
} as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Piecewise-linear lookup, for driving the steps above off a 0–1 clock. */
export function sampleSteps(p: number, stops: readonly number[]) {
  const t = APERTURE_STEPS.t;
  if (p <= t[0]) return stops[0];
  for (let i = 1; i < t.length; i++) {
    if (p <= t[i]) {
      const span = t[i] - t[i - 1];
      const local = span === 0 ? 1 : (p - t[i - 1]) / span;
      return stops[i - 1] + (stops[i] - stops[i - 1]) * local;
    }
  }
  return stops[stops.length - 1];
}
