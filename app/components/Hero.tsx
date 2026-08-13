"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EASE_OUT } from "../lib/motion";
import { useScrollContext } from "../context/ScrollContext";
import { asset } from "../lib/asset";

/**
 * The opening plate: the footage, corner to corner. No overlay, no tint, no
 * type — the header's mark and a scroll cue at the foot are the only things
 * over it.
 */
export default function Hero({
  ready = false,
  startAt = null,
}: {
  ready?: boolean;
  /**
   * Where the loading reel's copy of the footage had got to as it handed over.
   * Null while the loader still owns the screen — which is also what keeps this
   * video from playing behind it.
   */
  startAt?: number | null;
}) {
  const { containerRef } = useScrollContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Picks the footage up where the loading reel left it, and only then starts
  // playing.
  //
  // It used to autoplay from page load, alongside the reel's own copy of the same
  // file — two decoders running the same footage, and worse, running it out of
  // step. The reel's copy sits inside a fully collapsed clip until its frame
  // opens, and a video that is clipped to nothing does not count as rendered, so
  // the browser declines to autoplay it. It only started once its iris opened, by
  // which point this one had been running for the whole loading sequence. The
  // hand-off the loader is built around — the frame growing until it *is* the hero
  // — was landing on a three-and-a-half second jump cut.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || startAt === null) return;
    // A seek past the end would be rejected; the reel loops, so wrap it.
    if (Number.isFinite(v.duration) && v.duration > 0) {
      v.currentTime = startAt % v.duration;
    }
    void v.play().catch(() => {});
  }, [startAt]);

  // The video is meant to play with sound, but every browser blocks
  // autoplay-with-audio. Start muted so it always plays, then turn the
  // sound on at the visitor's first interaction of any kind.
  useEffect(() => {
    const unlock = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      v.volume = 1;
      void v.play().catch(() => {});
    };
    const opts = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("wheel", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Measured against the scroll container, deliberately not against this
  // section. The hero is `sticky top-0`, and a pinned sticky element reports its
  // pinned rect — top stays 0 for as long as it is stuck — so a target-based
  // useScroll here never advances past 0 and anything driven from it never
  // moves. (The hero's old scroll-linked text fade had exactly this bug; it only
  // looked like it worked because the incoming plate covered the type anyway.)
  const { scrollY } = useScroll({ container: containerRef });

  // The cue has done its job the moment the page starts moving, so it clears out
  // well before the first plate arrives rather than sitting under it.
  //
  // Driven off scroll *distance* with an explicit clamp, not off a normalised
  // progress value: mapping the progress range here produced a V — the cue
  // faded out over the first fifth and then faded back *in* over the rest of the
  // page, ending up visible again underneath the members plate. Pixels are also
  // the honest unit for "a couple of hundred pixels of scrolling is enough to
  // prove the page moves", and they do not shift meaning when a section is added.
  const cueOpacity = useTransform(scrollY, [0, 220], [1, 0], { clamp: true });

  return (
    <section id="hero" className="sticky top-0 h-dvh w-full overflow-hidden z-0">
      <video
        ref={videoRef}
        src={asset("/media/hero.mp4")}
        poster={asset("/media/hero-poster.jpg")}
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Outer layer carries the scroll-linked fade, inner one the arrival, so
          the two are not fighting over the same opacity. Purely a signal — it
          takes no pointer events, so it never intercepts a tap meant for the
          footage. */}
      <motion.div
        aria-hidden
        style={{ opacity: cueOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-[5dvh] z-10 flex justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: ready ? 0.6 : 0 }}
          className="flex items-center gap-4"
          style={{
            color: "var(--color-paper)",
            // The footage runs from bright sky to pale sand, so paper-on-video
            // cannot be relied on alone. A static shadow keeps it readable
            // without the colour inversion `mix-blend-difference` would bring.
            filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.45))",
          }}
        >
          <span className="font-[family-name:var(--font-body)] text-[11px] md:text-[12px] font-medium uppercase tracking-[0.35em] leading-none">
            Scroll
          </span>

          {/* A long shaft with a small head, drawn rather than shipped — it is
              a dozen bytes of markup instead of an image request, and stays
              crisp at any density. */}
          <motion.svg
            width="12"
            height="26"
            viewBox="0 0 12 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            // Transform-only loop, so it composites on the GPU. MotionConfig's
            // `reducedMotion="user"` drops the travel for anyone who asked.
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.9, ease: "easeInOut", repeat: Infinity }}
          >
            <path d="M6 0.7V25.3" />
            <path d="M1.4 20.2 6 25.3l4.6-5.1" />
          </motion.svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
