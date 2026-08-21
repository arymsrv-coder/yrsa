"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AgeGate from "./AgeGate";
import Logo from "../components/Logo";
import { asset } from "../lib/asset";

/** Where the paid work lives. The gate's Continue is a link straight to it. */
const OF_URL = "https://onlyfans.com/yrsaclicks";

/**
 * The last page — and it is the gate, nothing else.
 *
 * The site ends here: the landing page's one plate leads to this route, the
 * route asks for the age confirmation, and confirming leaves for OnlyFans in the
 * same tab. There is no members view behind the gate and nothing to reveal by
 * confirming, so this route holds no state at all — no stored flag, no
 * "verified" branch. The confirmation is a legal step in front of an outbound
 * link, not a key to something kept here.
 *
 * That is also why the flag is gone rather than kept for later: a stored
 * confirmation would mean a visitor who pressed Continue and then came back
 * arrived at a page with the gate already satisfied and nothing behind it — a
 * blank plate and no way forward.
 *
 * The gate is a full-bleed panel rather than a modal over the landing page,
 * because arriving here is a deliberate step, not an interruption. The plate
 * behind it is the same still the landing page uses for this section, so
 * following the link feels like walking into the picture that was just tapped.
 */
export default function MembersPage() {
  const router = useRouter();

  // Declining is a way back out, not a dead end.
  const onDismiss = useCallback(() => router.push("/"), [router]);

  return (
    <main
      className="relative min-h-dvh w-full overflow-hidden"
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      {/* The plate. Held at full strength and barely veiled at all, so she reads
          as the photograph this page is about rather than a texture behind it.

          It arrives with a short rise: the plate settles out of a slight
          over-scale as the veil below clears, so following "Continue" from the
          landing page reads as walking into the still that was just tapped.

          `object-position` is biased upward because this is a portrait still in
          a landscape viewport: a centred crop puts the fold of her jeans in the
          middle of a desktop screen and takes her face off the top of it. */}
      <div className="plate-arrive absolute inset-0 z-0">
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

        {/* The veil. Two per cent, and neutral rather than ink — enough to take
            the very top off the highlights, not enough to read as a layer. */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
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
          // The mark carries its own separation from whatever part of the plate
          // ends up behind it.
          style={{ filter: "drop-shadow(0 1px 10px rgba(0,0,0,0.55))" }}
        >
          <Logo className="w-[130px] md:w-[180px]" />
        </Link>
      </div>

      <AgeGate confirmHref={OF_URL} onDismiss={onDismiss} />

      {/* The arrival. One ink veil over the whole route that clears itself the
          moment the first paint lands, so pressing "Continue" on the landing
          page dissolves into this one instead of cutting to it.

          Deliberately a CSS animation and not a motion component: the veil
          starts opaque, and on this site's actual audience — Instagram's in-app
          browser on a cheap phone — waiting for hydration to clear it would
          mean holding a solid green screen for however long the JavaScript
          takes. Keyframes run off the paint, whether that script arrives or
          not. */}
      <div
        aria-hidden="true"
        className="arrival-veil pointer-events-none fixed inset-0 z-[270]"
        style={{ backgroundColor: "var(--color-ink)" }}
      />
    </main>
  );
}
