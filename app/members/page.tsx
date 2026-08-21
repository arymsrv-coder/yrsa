"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import AgeGate from "./AgeGate";
import Logo from "../components/Logo";
import { asset } from "../lib/asset";
import { EASE } from "../lib/motion";
import {
  isVerified,
  isVerifiedOnServer,
  markVerified,
  subscribe,
} from "./ageVerification";

/**
 * Where the paid work lives.
 *
 * Set this and the primary call to action appears. Left as the placeholder, the
 * page falls back to the archive-only view rather than shipping a link that
 * goes nowhere — a dead CTA in the one place a visitor has just confirmed their
 * age is worse than no CTA at all.
 */
const OF_URL = "SET_ONLYFANS_URL_HERE";

const OF_READY = OF_URL.startsWith("https://");

/**
 * The way in.
 *
 * One route doing two things in sequence: it asks for the age confirmation, and
 * once that is given it shows what is behind it. The archive itself is not built
 * yet, so what is behind it for now is the paid work plus a note about what is
 * coming — but the gate is real and the flag it sets is the same one the archive
 * will read, so nothing here has to change when the contents arrive.
 *
 * The gate is a full-bleed panel rather than a modal over the landing page,
 * because arriving here is a deliberate step, not an interruption.
 *
 * The plate behind both states is the same still the landing page uses for this
 * section, so following the link feels like walking into the picture that was
 * just tapped rather than arriving somewhere unrelated.
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
      {/* The plate. Held at full strength and only lightly knocked back, so she
          reads as the subject of the page rather than a texture behind it — the
          contrast the copy needs is bought by the scrim below instead, which is
          local to the text rather than flattening the whole frame.

          `object-position` is biased upward because this is a portrait still in
          a landscape viewport: a centred crop puts the fold of her jeans in the
          middle of a desktop screen and takes her face off the top of it. */}
      <div className="absolute inset-0 z-0">
        <Image
          src={asset("/media/members.jpg")}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          // This is the LCP element on the route. `priority` is deprecated in
          // Next 16; the documented replacement for an above-the-fold hero is
          // eager loading with a raised fetch priority.
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[center_22%] select-none"
          draggable={false}
        />

        {/* The dim. One flat wash, deliberately light — this is the 15–20% the
            plate is knocked back by, and nothing more. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-ink) 18%, transparent)",
          }}
        />

        {/* The scrim, and the reason the dim above can stay this light. Type
            over a photograph is a contrast problem wherever the photograph
            happens to be pale, and this one is pale exactly where the copy
            sits. Weighting the wash toward the lower two thirds gives the text
            a dark ground to stand on while leaving her face and shoulders in
            the clear. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg," +
              " color-mix(in srgb, var(--color-ink) 48%, transparent) 0%," +
              " color-mix(in srgb, var(--color-ink) 14%, transparent) 24%," +
              " color-mix(in srgb, var(--color-ink) 58%, transparent) 46%," +
              " color-mix(in srgb, var(--color-ink) 84%, transparent) 62%," +
              " color-mix(in srgb, var(--color-ink) 88%, transparent) 84%," +
              " color-mix(in srgb, var(--color-ink) 78%, transparent) 100%)",
          }}
        />
      </div>

      {/* The mark, back to the landing page. Not the shared Header — that one
          lives inside the scroll provider and this route has no smooth scroll. */}
      {/* Above the gate, not behind it — at z-20 the panel's ink washed the mark
          down to a ghost, which reads as a rendering fault rather than a brand. */}
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
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          // Held back until the gate is gone, so it is not read through the
          // panel on the way past.
          animate={verified ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.8, ease: EASE, delay: verified ? 0.25 : 0 }}
          className="flex flex-col items-center"
        >
          <p
            className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.28em] mb-5"
            style={{ color: "var(--color-pine-light)" }}
          >
            Members
          </p>
          <h1
            className="font-[family-name:var(--font-body)] font-extrabold uppercase text-[13vw] md:text-[7vw] leading-[0.9] tracking-[-0.02em]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.45)" }}
          >
            Private archive
          </h1>

          {OF_READY ? (
            <>
              {/* The primary action. Filled brass against the plate so it is
                  the one thing on the page that is unambiguously a button. */}
              <a
                href={OF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-9 inline-block cursor-pointer px-9 py-4 font-[family-name:var(--font-body)] text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{
                  backgroundColor: "var(--color-brass)",
                  color: "var(--color-paper)",
                  outlineColor: "var(--color-paper)",
                }}
              >
                Continue to OnlyFans
              </a>

              {/* Demoted to a note: it is what is coming, not what is here. */}
              <p
                className="mt-7 max-w-sm font-[family-name:var(--font-body)] text-[12px] md:text-[13px] leading-relaxed opacity-85"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
              >
                The archive here is still being prepared — unreleased sets,
                uncut film and the frames that never make the public page.
              </p>

              <Link
                href="/"
                className="mt-8 inline-block cursor-pointer font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] opacity-80 transition-opacity duration-200 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{
                  outlineColor: "var(--color-paper)",
                  textShadow: "0 1px 12px rgba(0,0,0,0.55)",
                }}
              >
                Back to yrsaclicks
              </Link>
            </>
          ) : (
            <>
              <p className="mt-6 max-w-md font-[family-name:var(--font-body)] text-[13px] md:text-[15px] leading-relaxed opacity-70">
                Being prepared. Unreleased sets, uncut film and the frames that
                never make the public page — opening soon.
              </p>

              <Link
                href="/"
                className="mt-10 inline-block border border-[var(--color-paper)] px-7 py-4 font-[family-name:var(--font-body)] text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-paper)] transition-colors duration-300 hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              >
                Back to yrsaclicks
              </Link>
            </>
          )}
        </motion.div>
      </div>

      <AgeGate open={!verified} onConfirm={onConfirm} onDismiss={onDismiss} />
    </main>
  );
}
