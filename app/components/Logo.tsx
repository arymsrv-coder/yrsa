"use client";

import { asset } from "../lib/asset";

/** Intrinsic proportions of the trimmed mark. */
export const LOGO_RATIO = "1200 / 308";

/**
 * Derived from `logo/logo2.png`, which arrives as a 2000×2000 canvas that is
 * 92% empty and carries a drop shadow. Both had to go: the empty margins would
 * make the element mostly dead space, and a drop shadow inside an alpha mask is
 * not a shadow — it paints as a second, softer copy of the mark in the same flat
 * colour. The source is trimmed to the letters and the ~150-alpha shadow band
 * removed, keeping the edge antialiasing above it.
 */
const LOGO_SRC = asset("/media/logo-yrsa2.png");

/**
 * The YRSA mark, drawn as a mask rather than an image.
 *
 * The artwork is a single-colour wordmark, so painting it as `currentColor`
 * through a mask lets it sit on the ink field, on the paper field, and inside
 * the header's `mix-blend-difference` without needing a separate asset for
 * each — it simply takes whatever colour it inherits.
 *
 * Give it a width; the aspect ratio supplies the height.
 */
export default function Logo({
  className = "",
  label,
}: {
  className?: string;
  /** Omit on decorative uses — a nearby link or heading already names it. */
  label?: string;
}) {
  return (
    <span
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        display: "block",
        aspectRatio: LOGO_RATIO,
        backgroundColor: "currentColor",
        maskImage: `url(${LOGO_SRC})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: `url(${LOGO_SRC})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
