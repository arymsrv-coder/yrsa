"use client";

import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { prefersReducedMotion } from "../lib/motion";

type ScrollContextValue = {
  lenis: Lenis | null;
  containerRef: RefObject<HTMLDivElement | null>;
};

const ScrollContext = createContext<ScrollContextValue | null>(null);

/**
 * Wraps the app in a Lenis-driven scroll container so Framer Motion's
 * useScroll can measure progress against the same smoothed scroll position
 * the user actually sees (native `window` scroll is discrete/instant and
 * would desync from the eased Lenis position).
 */
export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    // Smoothing is itself motion. Visitors who have asked for less get the
    // browser's own 1:1 scrolling, while Lenis stays mounted so the rest of the
    // app can keep measuring against a single scroll source.
    const reduce = prefersReducedMotion();

    const instance = new Lenis({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: !reduce,

      // Pace is set in two places, and they do different jobs.
      //
      // `wheelMultiplier` is how far one gesture asks the page to travel. It
      // is halved from the browser default feel so the sections, whose
      // transitions are scrubbed by scroll position, get room to actually play.
      //
      // `duration` + `easing` is how that travel is served. Lenis will use a
      // fixed-length eased glide when both are given and fall back to `lerp`
      // otherwise — and `lerp` is an exponential chase, so how much of a
      // gesture had landed by the time you stopped depended on how hard you
      // threw it. A fixed duration settles every gesture over the same span,
      // which is what makes the pace feel even instead of springy.
      duration: reduce ? undefined : 1.5,
      easing: reduce
        ? undefined
        : (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: reduce ? 1 : undefined,

      wheelMultiplier: reduce ? 1 : 0.15,
      touchMultiplier: reduce ? 1 : 1.2,

      // Ceiling on how far any single event may throw the page.
      //
      // A mouse notch and a trackpad flick are wildly different inputs — one
      // reports a tidy delta, the other reports bursts many times larger,
      // especially once momentum kicks in. That difference, not the multiplier,
      // is what made the pace feel unpredictable. Capping each event at a tenth
      // of a screen leaves ordinary scrolling untouched and only trims the
      // spikes, so both devices settle at the same rate.
      //
      // Note the units: Lenis applies `wheelMultiplier` before handing the
      // event here, so `deltaY` at this point is already in pixels-of-travel,
      // not raw wheel delta. It reads `data` back out after this returns, which
      // is why editing it in place is what reaches the scroller.
      virtualScroll: (data) => {
        const cap = window.innerHeight * 0.1;
        data.deltaY = Math.max(-cap, Math.min(cap, data.deltaY));
        return true;
      },
    });

    setLenis(instance);

    let rafId: number;
    function raf(time: number) {
      instance.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    if (!lenis) return;
    // Lenis owns scroll position via its own RAF loop, so a native
    // hash-jump (which just sets scrollTop directly) gets immediately
    // overridden on the next frame. Route internal anchor clicks through
    // lenis.scrollTo() instead so they animate and stick.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href^='#']");
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      // Every section here is `sticky`, and a pinned sticky element reports its
      // *pinned* position — both `getBoundingClientRect` and `offsetTop` say
      // "the top of the viewport", so asking Lenis to scroll to it resolves to
      // where you already are and nothing moves. Take sticky off for the length
      // of one measurement to get the layout position the section would occupy
      // unpinned, which is exactly where it comes to rest. Nothing paints in
      // between, and sticky is out of flow either way, so no layout shifts.
      const isSticky = getComputedStyle(target).position === "sticky";
      const previousPosition = target.style.position;
      if (isSticky) target.style.position = "static";
      const y =
        target.getBoundingClientRect().top -
        wrapper.getBoundingClientRect().top +
        wrapper.scrollTop;
      if (isSticky) target.style.position = previousPosition;

      lenis.scrollTo(y, {
        duration: 1.5,
        easing: (t) => 1 - Math.pow(1 - t, 5),
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [lenis]);

  return (
    <ScrollContext.Provider value={{ lenis, containerRef: wrapperRef }}>
      {/* One switch for every transform animation in the tree: visitors who ask
          for reduced motion keep the fades and lose the travel. */}
      <MotionConfig reducedMotion="user">
        <div
          ref={wrapperRef}
          className="fixed inset-0 overflow-y-auto overflow-x-hidden no-scrollbar"
        >
          <div ref={contentRef} className="relative">
            {children}
          </div>
        </div>
      </MotionConfig>
    </ScrollContext.Provider>
  );
}

export function useScrollContext() {
  const ctx = useContext(ScrollContext);
  if (!ctx) {
    throw new Error("useScrollContext must be used within a ScrollProvider");
  }
  return ctx;
}
