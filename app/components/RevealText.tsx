"use client";

import { motion, type Variants } from "framer-motion";

const EASE: [number, number, number, number] = [0.83, 0, 0.17, 1];

const letterVariants: Variants = {
  initial: { y: "200%", opacity: 1, transition: { duration: 0 } },
  animate: ({ charIndex, duration, stagger, delay }) => ({
    y: "0%",
    opacity: 1,
    transition: {
      duration,
      ease: EASE,
      delay: delay + charIndex * stagger,
    },
  }),
  exit: ({ charIndex, duration, stagger, totalChars }) => ({
    y: "200%",
    opacity: 1,
    transition: {
      duration,
      ease: EASE,
      delay: 0.5 * stagger * Math.max(0, totalChars - 1 - charIndex),
    },
  }),
};

/**
 * Per-letter wave reveal, matching ilcapoproduction.com's WaveTextReveal:
 * letters rise in with a 0.03s/char stagger and reverse (wave out, tail
 * first) when `trigger` goes false again, so scrolling back up un-reveals
 * the text with the same fluid motion instead of a hard cut.
 */
export default function RevealText({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.03,
  duration = 0.9,
  trigger = true,
  style,
}: {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  trigger?: boolean;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");
  const totalChars = words.join("").length;
  let charCounter = 0;

  return (
    <Tag className={className} style={style}>
      {words.map((word, wIdx) => {
        const isLast = wIdx === words.length - 1;
        return (
          <span key={wIdx} style={{ display: "inline-block" }}>
            <span className="inline-flex items-baseline whitespace-nowrap overflow-hidden py-[0.3em] -my-[0.3em] px-[0.1em] -mx-[0.1em] leading-none">
              {word.split("").map((char) => {
                const charIndex = charCounter++;
                return (
                  <span key={charIndex} className="inline-block">
                    <motion.span
                      variants={letterVariants}
                      custom={{ charIndex, duration, stagger, delay, totalChars }}
                      initial="initial"
                      animate={trigger ? "animate" : "exit"}
                      className="inline-block"
                      style={{ willChange: "transform, opacity" }}
                    >
                      {char}
                    </motion.span>
                  </span>
                );
              })}
            </span>
            {!isLast && " "}
          </span>
        );
      })}
    </Tag>
  );
}
