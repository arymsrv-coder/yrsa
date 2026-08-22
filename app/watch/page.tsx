import Link from "next/link";
import Logo from "../components/Logo";
import VideoRows from "./VideoRows";
import { hasClips, snapshot } from "../lib/youtube";

const CHANNEL_URL = "https://www.youtube.com/@YrsaClicks";

/**
 * The plate's button, restated for a paper page.
 *
 * Deliberately not shared with `StackSection`'s `CTA_CLASS`, even though the
 * proportions match. That button sits on a photograph and needs the devices
 * that lift it off one — a bone outline and a drop shadow. Both are wasted
 * here: bone against paper is very nearly the same colour, and a shadow with no
 * picture under it is decoration. Same size and weight, fewer tricks.
 */
const CTA =
  "inline-block rounded-[14px] bg-[var(--color-brass)] px-[34px] py-[19px] font-[family-name:var(--font-body)] text-[13px] md:text-[15px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-paper)] transition-colors duration-300 hover:bg-[var(--color-brass-deep)]";

const EYEBROW =
  "font-[family-name:var(--font-body)] text-[11px] md:text-[13px] font-medium uppercase tracking-[0.2em]";

/**
 * The channel, on her own site.
 *
 * Paper, which is the other half of the two-tone system and the ground the
 * landing page's channel plate already arrives on — so following that plate's
 * button reads as staying in the same room rather than cutting to a new one.
 * `body` is ink globally, so the ground is set here, on the page, following the
 * pattern `/members` established.
 *
 * `Header` is not used, and cannot be: it consumes `ScrollContext`, which
 * throws without a `ScrollProvider`, and mounting that provider would hand the
 * page to Lenis — which would then have to be fenced off the horizontal rows.
 * `/members` already shows what a standalone route does instead, which is to
 * place the mark itself and scroll natively.
 *
 * No age gate. This is public YouTube content and gating it would misrepresent
 * what it is.
 */
export default function WatchPage() {
  return (
    <main className="min-h-dvh w-full bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-24 pt-7 lg:px-10">
        <header className="flex flex-col items-center">
          {/* The mark is painted as `currentColor` through a mask, so on paper it
              comes out ink without needing a second asset. */}
          <Link
            href="/"
            aria-label="yrsaclicks — back to the front"
            className="block transition-opacity duration-200 hover:opacity-60"
          >
            <Logo className="w-[145px] md:w-[195px]" />
          </Link>

          <hr className="mt-5 h-px w-full border-0 bg-[color-mix(in_srgb,var(--color-ink)_18%,transparent)]" />
        </header>

        <div className="mt-9 mb-8 text-center">
          <p className={`${EYEBROW} opacity-60`}>02 — The channel</p>
          <h1 className="mt-3 font-[family-name:var(--font-body)] text-[11vw] font-semibold uppercase leading-[0.95] tracking-[-0.02em] md:text-[4vw]">
            Watch
          </h1>
        </div>

        {hasClips ? (
          <>
            <VideoRows shorts={snapshot.shorts} videos={snapshot.videos} />

            <div className="mt-14 text-center">
              <a
                href={CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={CTA}
              >
                Full archive on YouTube
              </a>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </div>
    </main>
  );
}

/**
 * What the page is until the channel has something on it.
 *
 * Not a defensive edge case — it is the live state as this was built. The
 * channel was created a fortnight earlier and has no public uploads, so an
 * invented row of placeholder tiles would be a lie told in the one place a
 * visitor is deciding whether the work is worth following.
 */
function Empty() {
  return (
    <div className="mx-auto max-w-[440px] py-14 text-center">
      <p className="font-[family-name:var(--font-body)] text-[15px] leading-[1.65] opacity-75">
        The channel is just getting started. Shorts and films land here as they
        go up — until then, the best way to catch the first one is from the
        channel itself.
      </p>

      <div className="mt-9">
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={CTA}
        >
          Follow on YouTube
        </a>
      </div>
    </div>
  );
}
