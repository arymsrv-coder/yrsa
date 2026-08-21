"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../lib/motion";

/**
 * Self-declared age confirmation. Nothing identifying is asked for or kept —
 * the only thing that persists is a single local flag, so a returning visitor
 * is not asked twice on the same device.
 *
 * The dialog traps focus while it is open and Escape closes it, matching the
 * "Not now" affordance.
 */
export default function AgeGate({
  open,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {open && <GatePanel onConfirm={onConfirm} onDismiss={onDismiss} />}
    </AnimatePresence>
  );
}

/**
 * Mounted only while the dialog is up, so the checkbox starts unticked every
 * time without an effect reaching in to reset it.
 */
function GatePanel({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[250] flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      // Near-opaque ink used to sit here, which made the plate behind the gate
      // invisible and the confirmation feel like it belonged to a different
      // page. Held back to a little over half instead, with a blur doing the
      // work the opacity used to: she stays legible as an image, the panel
      // below stays legible as type, and the two read as one screen.
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-ink) 38%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-heading"
    >
      <motion.div
        ref={panelRef}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
        className="w-full max-w-[19rem] border p-6 md:p-8 text-center"
        style={{
          borderColor:
            "color-mix(in srgb, var(--color-paper) 32%, transparent)",
          backgroundColor:
            "color-mix(in srgb, var(--color-ink) 97%, transparent)",
          color: "var(--color-paper)",
        }}
      >
        <p
          className="font-[family-name:var(--font-body)] text-[10px] uppercase tracking-[0.26em] mb-3"
          style={{ color: "var(--color-pine-light)" }}
        >
          Age verification
        </p>
        <h2
          id="age-gate-heading"
          className="font-[family-name:var(--font-body)] font-extrabold uppercase text-[21px] md:text-[25px] leading-[1.05] tracking-[-0.02em] mb-3"
        >
          You must be 18 or older
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[12px] leading-relaxed opacity-75 mb-5">
          This area contains adult material. By continuing you confirm you are
          of legal age and that viewing is lawful where you are.
        </p>

        <label className="flex min-h-[44px] items-center gap-3 py-1.5 text-left text-[12px] leading-snug mb-5 cursor-pointer opacity-90">
          <input
            // Pulls focus into the dialog as it opens.
            autoFocus
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-brass)]"
          />
          I confirm I am 18 or older.
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={onConfirm}
          className="min-h-[44px] w-full cursor-pointer px-7 py-3 font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: "var(--color-brass)",
            color: "var(--color-paper)",
          }}
        >
          Continue
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 block min-h-[44px] w-full cursor-pointer py-3 font-[family-name:var(--font-body)] text-[10px] uppercase tracking-[0.2em] opacity-60 transition-opacity duration-200 hover:opacity-100"
        >
          Not now
        </button>

        <p className="mt-5 font-[family-name:var(--font-body)] text-[10px] leading-relaxed opacity-40">
          Age verification is self-declared — no identifying information is
          collected or stored.
        </p>
      </motion.div>
    </motion.div>
  );
}
