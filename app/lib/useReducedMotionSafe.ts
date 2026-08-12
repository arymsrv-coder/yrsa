"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** The server cannot know the preference, so it always renders the full motion. */
const getServerSnapshot = () => false;

/**
 * The motion preference, read the way an external store should be read.
 *
 * Branching on `matchMedia` during render would make the server and the
 * hydrating client disagree about any style derived from it — here that is the
 * mask string on every section, which React would refuse to patch up. Going
 * through `useSyncExternalStore` renders the server's answer during hydration
 * and swaps to the real one on the commit immediately after.
 */
export function useReducedMotionSafe() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
