"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "../lib/motion";

const STAGGER = 0.02;
const DURATION = 0.6;
/** How far a letter travels to clear its own clip window. */
const TRAVEL = 150;

/**
 * A link whose label rolls over on hover: every character is drawn twice, the
 * resting copy lifts out of a per-character clip window while its duplicate
 * rises into the gap behind it. Letters leave head-first and come back
 * tail-first, so the label unrolls and re-rolls rather than flipping.
 *
 * An optional hairline sweeps in underneath once the last letter has landed,
 * and retracts immediately on leave.
 *
 * Touch devices never get the hover state, so the duplicate stays parked below
 * the clip and the label behaves like ordinary text.
 */
export default function HoverRoll({
  text,
  href,
  as = "a",
  className = "",
  underline = true,
  external,
  onClick,
  style,
}: {
  text: string;
  href?: string;
  as?: "a" | "button" | "span";
  className?: string;
  underline?: boolean;
  external?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const on = canHover && hovered;
  const chars = [...text];
  // Spaces are rendered but not counted, so the stagger tracks visible letters.
  const letterCount = chars.filter((c) => c !== " ").length;
  let visibleIndex = 0;

  const inner = (
    <span className="relative inline-block overflow-hidden py-[0.25em] -my-[0.25em] px-[0.1em] -mx-[0.1em]">
      <span className="inline-flex whitespace-nowrap">
        {chars.map((char, i) => {
          if (char === " ") {
            return (
              <span key={i} aria-hidden className="inline-block">
                &nbsp;
              </span>
            );
          }
          const ci = visibleIndex++;
          const delay = on
            ? ci * STAGGER
            : (letterCount - 1 - ci) * STAGGER * 0.7;
          const transition = { duration: DURATION, ease: EASE_OUT, delay };
          return (
            <span
              key={i}
              aria-hidden
              className="relative inline-block overflow-hidden px-[0.1em] -mx-[0.1em]"
            >
              <motion.span
                className="block"
                animate={{ y: on ? `-${TRAVEL}%` : "0%" }}
                transition={transition}
              >
                {char}
              </motion.span>
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                initial={{ y: `${TRAVEL}%` }}
                animate={{ y: on ? "0%" : `${TRAVEL}%` }}
                transition={transition}
              >
                {char}
              </motion.span>
            </span>
          );
        })}
      </span>

      {underline && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-[1px] w-full bg-current"
          style={{ originX: 0 }}
          initial={{ scaleX: 0, y: 1 }}
          animate={{ scaleX: on ? 1 : 0, y: on ? -1 : 1 }}
          transition={{
            duration: 0.4,
            ease: EASE_OUT,
            // Waits for the last letter on the way in; snaps back on the way out.
            delay: on ? letterCount * STAGGER * 0.8 : 0,
          }}
        />
      )}
      {/* The visible copies are aria-hidden so assistive tech reads the label
          once, not twice per character. */}
      <span className="sr-only">{text}</span>
    </span>
  );

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  if (as === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative isolate inline-block cursor-pointer ${className}`}
        style={style}
        {...handlers}
      >
        {inner}
      </button>
    );
  }

  if (as === "span") {
    return (
      <span className={`relative isolate inline-block ${className}`} style={style} {...handlers}>
        {inner}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`relative isolate inline-block cursor-pointer ${className}`}
      style={style}
      {...handlers}
    >
      {inner}
    </a>
  );
}
