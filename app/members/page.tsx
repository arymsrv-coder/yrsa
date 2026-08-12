"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import AgeGate from "./AgeGate";
import Logo from "../components/Logo";
import { EASE } from "../lib/motion";
import {
  isVerified,
  isVerifiedOnServer,
  markVerified,
  subscribe,
} from "./ageVerification";

/**
 * The way in.
 *
 * One route doing two things in sequence: it asks for the age confirmation, and
 * once that is given it shows what is behind it. The archive itself is not built
 * yet, so what is behind it for now is a holding page — but the gate is real and
 * the flag it sets is the same one the archive will read, so nothing here has to
 * change when the contents arrive.
 *
 * The gate is a full-bleed panel rather than a modal over the landing page,
 * because arriving here is a deliberate step, not an interruption.
 */
export default function MembersPage() {
  const router = useRouter();

  // Server and hydrating client both start at "not verified", so the real value
  // lands on the first commit afterwards — no flash of the wrong view.
  const verified = useSyncExternalStore(
    subscribe,
    isVerified,
    isVerifiedOnServer,
  );

  const onConfirm = useCallback(() => markVerified(), []);

  // Declining is a way back out, not a dead end.
  const onDismiss = useCallback(() => router.push("/"), [router]);

  return (
    <main
      className="relative min-h-dvh w-full overflow-hidden"
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      {/* The mark, back to the landing page. Not the shared Header — that one
          lives inside the scroll provider and this route has no smooth scroll. */}
      {/* Above the gate, not behind it — at z-20 the panel's near-opaque ink
          washed the mark down to a ghost, which reads as a rendering fault
          rather than a brand. */}
      <div className="absolute top-[20px] lg:top-[28px] left-0 w-full z-[260] flex justify-center px-4">
        <Link
          href="/"
          aria-label="yrsaclicks — back to the landing page"
          className="block cursor-pointer transition-opacity duration-200 hover:opacity-60"
        >
          <Logo className="w-[130px] md:w-[180px]" />
        </Link>
      </div>

      {/* Behind the gate. Rendered either way so that confirming reveals
          something already in place rather than triggering a second load. */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          // Held back until the gate is gone, so it is not read through the
          // panel on the way past.
          animate={verified ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.8, ease: EASE, delay: verified ? 0.25 : 0 }}
        >
          <p
            className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.28em] mb-5"
            style={{ color: "var(--color-pine-light)" }}
          >
            Members
          </p>
          <h1 className="font-[family-name:var(--font-body)] font-extrabold uppercase text-[13vw] md:text-[7vw] leading-[0.9] tracking-[-0.02em]">
            Private archive
          </h1>
          <p className="mt-6 max-w-md font-[family-name:var(--font-body)] text-[13px] md:text-[15px] leading-relaxed opacity-70">
            Being prepared. Unreleased sets, uncut film and the frames that never
            make the public page — opening soon.
          </p>

          <Link
            href="/"
            className="mt-10 inline-block border border-[var(--color-paper)] px-7 py-4 font-[family-name:var(--font-body)] text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-paper)] transition-colors duration-300 hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            Back to yrsaclicks
          </Link>
        </motion.div>
      </div>

      <AgeGate open={!verified} onConfirm={onConfirm} onDismiss={onDismiss} />
    </main>
  );
}
