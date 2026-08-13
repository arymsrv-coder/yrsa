"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { APERTURE_SHUT } from "../lib/motion";

/**
 * A panel with a rectangular hole in the middle that opens outward.
 *
 * Both values run 50 → 0: 50 covers completely, 0 is fully retracted. `sy` moves
 * the top and bottom edges of the hole, `sx` the left and right.
 *
 * Built as four opaque bands — one per edge — each laid out across half the panel
 * and scaled from its own outer edge, so at 50 the four bands tile the panel
 * exactly and it is a solid wall, and as the numbers fall each retreats to its
 * edge and what is left is a frame that thins to nothing.
 *
 * It was a mask before: four gradients composited into `mask-image`, rebuilt as a
 * string on every frame. That is correct and it reads identically, but no browser
 * can composite `mask-image`, so each frame repainted a full-viewport mask on the
 * main thread — for the entire length of the scroll, on a phone, which is the one
 * place the budget does not exist. `transform: scale` is the same geometry
 * expressed in the one property that is always cheap, and it stays on the
 * compositor. Nothing about the shape or the timing changed.
 *
 * The bands run a hair past half so they overlap in the middle rather than
 * meeting on an exact seam — at fractional device pixels an exact meeting can
 * leave a visible hairline straight down the centre of a shut panel.
 */
export default function Aperture({
  sx,
  sy,
  color,
  className = "",
}: {
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  /** The panel's colour. Sits on the bands, since the panel itself is a hole. */
  color: string;
  className?: string;
}) {
  const scaleY = useTransform(sy, (v) => v / APERTURE_SHUT);
  const scaleX = useTransform(sx, (v) => v / APERTURE_SHUT);

  const band = "absolute" as const;
  const half = "calc(50% + 1px)";

  return (
    <div className={className}>
      <motion.div
        className={band}
        style={{
          insetInline: 0,
          top: 0,
          height: half,
          transformOrigin: "top",
          scaleY,
          backgroundColor: color,
        }}
      />
      <motion.div
        className={band}
        style={{
          insetInline: 0,
          bottom: 0,
          height: half,
          transformOrigin: "bottom",
          scaleY,
          backgroundColor: color,
        }}
      />
      <motion.div
        className={band}
        style={{
          insetBlock: 0,
          left: 0,
          width: half,
          transformOrigin: "left",
          scaleX,
          backgroundColor: color,
        }}
      />
      <motion.div
        className={band}
        style={{
          insetBlock: 0,
          right: 0,
          width: half,
          transformOrigin: "right",
          scaleX,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
