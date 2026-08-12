"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Logo from "./Logo";
import { useScrollContext } from "../context/ScrollContext";
import {
  APERTURE_CLIP,
  APERTURE_TIMES,
  EASE,
  LOAD_MS,
  prefersReducedMotion,
} from "../lib/motion";

/**
 * What plays in the strip while the counter runs — the regions the site names,
 * in order, ending on the hero footage itself so the frame grows out onto the
 * exact shot the reel just handed over.
 */
const REEL = [
  { src: "/media/reel/01-arizona.jpg", alt: "" },
  { src: "/media/reel/02-bisbee.jpg", alt: "" },
  { src: "/media/reel/03-cabot-overlook.jpg", alt: "" },
  { src: "/media/reel/04-peggys-cove.jpg", alt: "" },
  { src: "/media/reel/05-cabot-water.jpg", alt: "" },
  { src: "/media/reel/06-florida.jpg", alt: "" },
];

/** The frame is 86vw until it hits its own ceiling. */
const REEL_SIZES = "(min-width: 1280px) 1100px, 86vw";

/** Frames, counting the closing footage. */
const REEL_LENGTH = REEL.length + 1;

/** Seconds between one frame opening and the next. */
const STEP = LOAD_MS / 1000 / REEL_LENGTH;

/** Each frame is still opening as the next begins, so the reel never stalls. */
const IRIS_S = STEP * 1.4;

/** Matches the reference's clip-path curve — a hard push, then a long glide. */
const IRIS_EASE: [number, number, number, number] = [0.625, 0.05, 0, 1];

/** How long the frame takes to grow from the reel out to full bleed. */
const ZOOM_S = 1.7;

/** Where the frame has to get to in order to become the page. */
type Zoom = { scale: number; x: number; y: number };

/**
 * Opening sequence. The wordmark sits under a large frame of footage on the ink
 * field, the frame's shots open one out of the next, and a counter runs 0 → 100
 * at the bottom.
 *
 * At 100 the reel has arrived at the hero footage, and that frame simply keeps
 * growing — scaling up and recentring until it fills the viewport exactly, at
 * which point it *is* the landing page's hero and the panel unmounts from
 * behind it. The wordmark and counter fade off as the growth begins so the last
 * thing moving is the footage itself.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const { lenis } = useScrollContext();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(true);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  // The frame that grows. Measured at the moment the counter lands so the
  // scale is exact for this viewport rather than assumed from the CSS.
  const frameRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Held in a ref so the countdown effect never restarts when the parent
  // re-renders with a fresh callback identity.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  // Nothing should scroll behind the panel.
  useEffect(() => {
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
  }, [lenis, open]);

  /**
   * From the frame's laid-out rect to the transform that makes it cover the
   * viewport. `scale` takes the larger of the two ratios so neither axis is
   * left short — the video is `object-cover`, so the overflow simply crops —
   * and x/y carry the frame's centre onto the viewport's, since the reel sits
   * above centre to leave room for the wordmark.
   */
  const measureZoom = useCallback((): Zoom | null => {
    const el = frameRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      scale: Math.max(vw / r.width, vh / r.height),
      x: vw / 2 - (r.left + r.width / 2),
      y: vh / 2 - (r.top + r.height / 2),
    };
  }, []);

  useEffect(() => {
    // Reduced motion runs the same path on a zero-length clock, so it lands on
    // the first frame instead of being a second branch to keep in step.
    const reduce = prefersReducedMotion();
    const total = reduce ? 0 : LOAD_MS;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = total === 0 ? 1 : Math.min(1, (now - start) / total);
      setCount(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // The header and hero text reveal while the frame is still growing, so
      // the page is already alive by the time it lands.
      doneRef.current();

      // Measured here, with the reel at its resting size, so the growth starts
      // from exactly where the frame is standing. Reduced motion gets no
      // growth, and a frame that cannot be measured must not strand the
      // visitor behind the panel — both simply come away.
      const next = reduce ? null : measureZoom();
      if (next) setZoom(next);
      else close();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [close, measureZoom]);

  const leaving = zoom !== null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[300] pointer-events-none overflow-hidden"
          style={{ backgroundColor: "var(--color-ink)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* The reel, at a size that carries the footage rather than
                sampling it. Each shot opens out of nothing rather than growing
                a box, so the strip repeats the frame's own centre-out gesture
                in miniature, and every shot is painted over the one before it —
                no cuts, no cross-fades, just successive openings.

                This is also the element that becomes the page: on leaving it
                scales up and recentres until its edges are the viewport's. */}
            <motion.div
              ref={frameRef}
              className="relative h-[52dvh] w-[86vw] max-w-[1100px] overflow-hidden"
              animate={
                zoom
                  ? { scale: zoom.scale, x: zoom.x, y: zoom.y }
                  : { scale: 1, x: 0, y: 0 }
              }
              transition={{ duration: ZOOM_S, ease: EASE }}
              // Once the footage has filled the viewport the panel behind it has
              // nothing left to show, so it comes away here rather than on a
              // second timer.
              onAnimationComplete={() => {
                if (zoom) close();
              }}
              style={{ willChange: "transform" }}
            >
              {REEL.map((frame, i) => (
                <motion.div
                  key={frame.src}
                  initial={{ clipPath: APERTURE_CLIP[0] }}
                  animate={{ clipPath: APERTURE_CLIP }}
                  transition={{
                    duration: IRIS_S,
                    ease: IRIS_EASE,
                    times: APERTURE_TIMES,
                    delay: i * STEP,
                  }}
                  className="absolute inset-0"
                  style={{ willChange: "clip-path" }}
                >
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    fill
                    sizes={REEL_SIZES}
                    // The first few are needed before lazy loading would get
                    // to them; the rest have seconds of runway.
                    priority={i < 3}
                    className="object-cover"
                  />
                </motion.div>
              ))}

              {/* Last shot is the hero itself, so what grows out to fill the
                  screen is the footage the landing page is already playing. */}
              <motion.div
                initial={{ clipPath: APERTURE_CLIP[0] }}
                animate={{ clipPath: APERTURE_CLIP }}
                transition={{
                  duration: IRIS_S,
                  ease: IRIS_EASE,
                  times: APERTURE_TIMES,
                  delay: REEL.length * STEP,
                }}
                className="absolute inset-0"
                style={{ willChange: "clip-path" }}
              >
                <video
                  src="/media/hero.mp4"
                  poster="/media/hero-poster.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </motion.div>

            {/* Held narrower than the frame above it, so the mark reads as the
                caption to a large plate rather than competing with it. Fades as
                the growth starts — the real header takes the mark from here. */}
            <motion.div
              animate={{ opacity: leaving ? 0 : 1 }}
              transition={{ duration: 0.5, ease: "linear" }}
              className="mt-[4dvh] w-[42vw] max-w-[400px]"
              style={{ color: "var(--color-paper)" }}
            >
              <Logo label="yrsaclicks" className="w-full" />
            </motion.div>
          </div>

          <div className="absolute bottom-[6dvh] left-0 right-0 flex justify-center">
            <div className="overflow-hidden leading-none">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: leaving ? "100%" : "0%" }}
                transition={{
                  duration: 0.6,
                  ease: EASE,
                  delay: leaving ? 0 : 0.2,
                }}
                className="font-[family-name:var(--font-body)] text-[13px] tabular-nums leading-none"
                style={{ color: "var(--color-paper)" }}
              >
                {count}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
