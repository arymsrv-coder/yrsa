"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Logo from "./Logo";
import { useScrollContext } from "../context/ScrollContext";
import { asset } from "../lib/asset";
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
  { src: asset("/media/reel/reel-01.jpg"), alt: "" },
  { src: asset("/media/reel/reel-02.jpg"), alt: "" },
  { src: asset("/media/reel/reel-03.jpg"), alt: "" },
  { src: asset("/media/reel/reel-04.jpg"), alt: "" },
  { src: asset("/media/reel/reel-05.jpg"), alt: "" },
  { src: asset("/media/reel/reel-06.jpg"), alt: "" },
  { src: asset("/media/reel/reel-07.jpg"), alt: "" },
  { src: asset("/media/reel/reel-08.jpg"), alt: "" },
  { src: asset("/media/reel/reel-09.jpg"), alt: "" },
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
export default function Loader({
  onDone,
  onHandoff,
}: {
  /** The counter has landed — the header and hero type can start revealing. */
  onDone: () => void;
  /**
   * The panel is coming away this frame, so the hero is about to be what the
   * visitor is looking at. Carries the reel's playback position, which is the
   * frame the growing footage is on at that instant — the hero picks the footage
   * up from there rather than starting it over.
   *
   * Deliberately a separate moment from `onDone`. The counter lands a full
   * `ZOOM_S` before the panel unmounts, and a position sampled then is already
   * stale by the time anyone can see the hero.
   */
  onHandoff: (videoTime: number) => void;
}) {
  const { lenis } = useScrollContext();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(true);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  // The frame that grows. Measured at the moment the counter lands so the
  // scale is exact for this viewport rather than assumed from the CSS.
  const frameRef = useRef<HTMLDivElement | null>(null);

  // What the frame has to grow to cover. The panel is `fixed inset-0`, so its own
  // rect *is* the target — and asking the element rather than the window is what
  // makes the arithmetic below exact. `window.innerHeight` is not the same number
  // as the `dvh` the frame is sized in whenever a mobile browser has its toolbar
  // out, and the frame would stop a little short of the edges, showing a band of
  // the panel behind it at the instant of hand-off.
  const panelRef = useRef<HTMLDivElement | null>(null);


  // The reel's closing frame. Its playback position is what the hero inherits.
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);

  const handoffRef = useRef(onHandoff);
  useEffect(() => {
    handoffRef.current = onHandoff;
  }, [onHandoff]);

  const close = useCallback(() => {
    handoffRef.current(reelVideoRef.current?.currentTime ?? 0);
    setOpen(false);
  }, []);

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
    const panel = panelRef.current;
    if (!el || !panel) return null;
    const r = el.getBoundingClientRect();
    const target = panel.getBoundingClientRect();
    if (!r.width || !r.height || !target.width || !target.height) return null;
    return {
      scale: Math.max(target.width / r.width, target.height / r.height),
      x: target.left + target.width / 2 - (r.left + r.width / 2),
      y: target.top + target.height / 2 - (r.top + r.height / 2),
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
          ref={panelRef}
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
                >
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    fill
                    sizes={REEL_SIZES}
                    // The first few are needed before lazy loading would get
                    // to them; the rest have seconds of runway.
                    priority={i < 3}
                    // These flash by in under half a second each, so full
                    // quality is wasted bytes — this trims the payload
                    // noticeably on the low-end phones this loader runs on.
                    quality={70}
                    // Portrait shots in a landscape frame: a centered crop
                    // drifts into her torso on wide screens. Biasing toward
                    // the top keeps her face and shoulders in frame instead.
                    className="object-cover object-top"
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
              >
                <video
                  ref={reelVideoRef}
                  src={asset("/media/hero.mp4")}
                  poster={asset("/media/hero-poster.jpg")}
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
              className="mt-[4dvh] w-[45vw] max-w-[430px]"
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
