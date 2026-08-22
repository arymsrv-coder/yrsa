"use client";

import { asset } from "../lib/asset";

/** Intrinsic proportions of the trimmed mark. */
export const LOGO_RATIO = "1200 / 469";

/**
 * Derived from `logo/yrsalogo_clean.png`, which arrives as black ink on an
 * opaque white field — it carries no alpha at all. A mask reads the alpha
 * channel, so an untouched copy would mask nothing away and paint a solid
 * rectangle. The ink coverage becomes the alpha instead — opaque where the
 * source is black, clear where it is white — and the white margin is trimmed
 * off, so the element is the letters rather than mostly dead space.
 */
const LOGO_SRC = asset("/media/logo-yrsa3.png");

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
