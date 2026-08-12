"use client";

/**
 * The age confirmation, treated as what it actually is: a tiny external store.
 *
 * Reading it through `useSyncExternalStore` rather than an effect means the
 * server and the hydrating client agree (both start at "not verified") and the
 * real value lands on the first commit afterwards — no flash of the wrong view
 * and no cascading render.
 *
 * Scope is deliberately **one browsing session**, not one device: it lives in
 * `sessionStorage`, so closing the browser asks again. That is the reason it is
 * not `localStorage` — a permanent flag meant a visitor who confirmed once was
 * never asked again on that device, which made the gate effectively invisible
 * to anyone testing it. Worth knowing that in a Meta in-app webview, where
 * storage is cleared aggressively between visits, this behaves as "ask nearly
 * every time".
 *
 * One boolean, one session. Nothing identifying is written.
 */
const KEY = "yrsa_age_verified";

const listeners = new Set<() => void>();

export function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `sessionStorage` is per-tab, so this only reaches windows that share this
  // session (a tab opened from this one). Harmless, and keeps those in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function isVerified() {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    // Private browsing can throw on access; treat it as not yet verified.
    return false;
  }
}

/** Nothing is verified until the client has had a chance to look. */
export function isVerifiedOnServer() {
  return false;
}

export function markVerified() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Non-persistent is fine — they will simply be asked again.
  }
  // `storage` does not fire in the tab that wrote it, so tell this one directly.
  listeners.forEach((notify) => notify());
}
