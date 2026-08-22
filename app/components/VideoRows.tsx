"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { asset } from "../lib/asset";
import { CHANNEL_URL, formatDuration, formatWhen, type Clip } from "../lib/youtube";
import { useReducedMotionSafe } from "../lib/useReducedMotionSafe";
import { useOptionalLenis } from "../context/ScrollContext";

type Kind = "short" | "video";

/** Which clip the player is showing, and which shape it needs. */
type Playing = { clip: Clip; kind: Kind };

/**
 * The two rows and the player.
 *
 * Nothing here is a carousel library. The rows are native horizontal scrollers,
 * which is what makes a thumb-swipe work with no code at all — the chevrons
 * drive the same `scrollLeft` a finger does, so they are a convenience over the
 * scroller rather than the only way through it.
 *
 * These rows now sit on the landing page, which means they sit inside Lenis —
 * the arrangement the standalone route existed to avoid. Lenis claims wheel and
 * touch for the whole page, so a horizontal scroller inside it never sees the
 * gestures meant for it: a sideways trackpad swipe scrolls the page down
 * instead of the row across. The attribute on each scroller hands those
 * gestures back.
 */
export default function VideoRows({
  shorts,
  videos,
}: {
  shorts: Clip[];
  videos: Clip[];
}) {
  const [playing, setPlaying] = useState<Playing | null>(null);

  // Where to put focus back when the player closes. A lightbox that dumps focus
  // at the top of the document makes the keyboard start the row again.
  const opener = useRef<HTMLButtonElement | null>(null);

  const open = useCallback((clip: Clip, kind: Kind, from: HTMLButtonElement) => {
    opener.current = from;
    setPlaying({ clip, kind });
  }, []);

  const close = useCallback(() => {
    setPlaying(null);
    opener.current?.focus();
    opener.current = null;
  }, []);

  return (
    <>
      {shorts.length > 0 && (
        <Row label="Shorts" kind="short" clips={shorts} onOpen={open} />
      )}

      {shorts.length > 0 && videos.length > 0 && (
        <hr className="my-9 h-px border-0 bg-[color-mix(in_srgb,var(--color-ink)_18%,transparent)]" />
      )}

      {videos.length > 0 && (
        <Row label="Videos" kind="video" clips={videos} onOpen={open} />
      )}

      {playing && <Player playing={playing} onClose={close} />}
    </>
  );
}

/** Uppercase, wide-tracked — the same eyebrow the plates wear. */
const EYEBROW =
  "font-[family-name:var(--font-body)] text-[11px] md:text-[13px] font-medium uppercase tracking-[0.2em]";

function Row({
  label,
  kind,
  clips,
  onOpen,
}: {
  label: string;
  kind: Kind;
  clips: Clip[];
  onOpen: (clip: Clip, kind: Kind, from: HTMLButtonElement) => void;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotionSafe();
  const [ends, setEnds] = useState({ start: true, end: false });

  // Which chevrons are worth offering. Recomputed on scroll and on resize,
  // because how much of the row overflows depends on the viewport.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEnds({
      start: el.scrollLeft <= 1,
      // A row that fits entirely has nowhere to go in either direction.
      end: max <= 1 || el.scrollLeft >= max - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    // One tile-and-gap at a time, measured off the first tile rather than
    // hardcoded, so the two rows' different tile widths both come out right.
    const step = el.firstElementChild?.clientWidth ?? el.clientWidth * 0.8;
    el.scrollBy({
      left: direction * (step + 12),
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        {/* `h3`, under the section's own "Watch". These were `h2`, which put a
          row label at the same level as the heading it belongs to. */}
      <h3 className={`${EYEBROW} opacity-80`}>{label}</h3>

        <div className="flex items-center gap-1">
          <Chevron
            dir="left"
            label={`Scroll ${label.toLowerCase()} back`}
            disabled={ends.start}
            onClick={() => nudge(-1)}
          />
          <Chevron
            dir="right"
            label={`Scroll ${label.toLowerCase()} forward`}
            disabled={ends.end}
            onClick={() => nudge(1)}
          />
        </div>
      </div>

      {/* The row overflows on purpose. A tile clipped by the right edge is what
          tells a visitor it continues sideways — the chevrons only confirm it. */}
      <div
        ref={scroller}
        onScroll={measure}
        // Lenis, if it is running, must keep its hands off *sideways* gestures
        // over this row. Without that, one is swallowed by the page.
        //
        // The axis matters, and reading the attribute name the obvious way gets
        // it backwards: this says "prevent Lenis when the gesture is
        // horizontal", not "prevent horizontal scrolling". Lenis works the
        // orientation out per event from which delta is larger and only honours
        // the attribute on a match, so a vertical wheel or drag over a
        // thumbnail still belongs to the page.
        //
        // The plain `data-lenis-prevent` was here first and took both axes,
        // which handed every vertical gesture over a row straight to the
        // browser. Native scrolling is neither paced nor smoothed — see the
        // wheel settings in `ScrollContext` for how far off the page's own pace
        // that is — so the page lurched to roughly three times its speed the
        // moment a thumbnail came under the pointer. Which, now that the
        // channel's aperture opens onto this row, is the exact frame the
        // transition becomes visible: it went from scrubbing to snapping.
        data-lenis-prevent-horizontal
        // `items-start` is load-bearing, not tidiness. A flex row stretches its
        // items to the tallest by default, and a `<button>` centres its own
        // content vertically by UA rule — so a tile whose title wraps to two
        // lines became the tallest item and every one-line neighbour's
        // thumbnail slid down to centre against it. The row of frames came out
        // visibly stepped. Anchoring the items to the top keeps every thumbnail
        // on one line and lets the titles rag underneath, which is the right way
        // round.
        className="no-scrollbar flex items-start snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1"
      >
        {clips.map((clip) => (
          <Tile key={clip.id} clip={clip} kind={kind} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

/**
 * A bare chevron, not a white disc.
 *
 * The disc is YouTube's; on a paper ground it would be the loudest thing on the
 * page and it would be pointing at furniture rather than at work.
 */
function Chevron({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      // 44px, not the 32 this was: the smallest a touch target may be and
      // still be reliably hittable with a thumb. The chevron itself stays at
      // 20 — what grew is the box around it, so the row's furniture reads
      // exactly as quietly as before and is simply easier to hit.
      className="grid h-11 w-11 place-items-center rounded-full text-[var(--color-ink)] transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-20 hover:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function Tile({
  clip,
  kind,
  onOpen,
}: {
  clip: Clip;
  kind: Kind;
  onOpen: (clip: Clip, kind: Kind, from: HTMLButtonElement) => void;
}) {
  const duration = formatDuration(clip.seconds);
  const short = kind === "short";

  const frame = (
    <>
      {/* A hairline, because the ground is paper: a pale frame with no edge
          bleeds into the page and stops reading as a picture. */}
      <div
        className={`relative overflow-hidden rounded-[3px] border border-[color-mix(in_srgb,var(--color-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] ${
          short ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        <Image
          src={asset(clip.thumb)}
          alt=""
          fill
          sizes={short ? "150px" : "304px"}
          className="object-cover transition-opacity duration-300 group-hover:opacity-85"
        />

        {/* Shorts have no duration worth stating — the format is the answer. */}
        {!short && duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded-[3px] bg-[color-mix(in_srgb,#141a15_85%,transparent)] px-1.5 py-0.5 font-[family-name:var(--font-body)] text-[10px] font-semibold tabular-nums text-[var(--color-paper)]">
            {duration}
          </span>
        )}
      </div>

      <p className="mt-2 font-[family-name:var(--font-body)] text-[12px] md:text-[13px] font-medium leading-[1.35] text-[var(--color-ink)] group-hover:underline">
        {clip.title}
      </p>
    </>
  );

  const shell = `group shrink-0 snap-start text-left block ${
    short ? "w-[132px] md:w-[150px]" : "w-[248px] md:w-[304px]"
  }`;

  // A stand-in has no video behind it, so it must not open one. Pressing it
  // goes to the channel, which is the honest answer to "where is this" and the
  // one place the real thing will appear first. Deliberately an anchor rather
  // than a button with a redirect: it looks like what it does in the status
  // bar, and it can be opened in a new tab like any other link.
  if (clip.placeholder) {
    return (
      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={shell}
      >
        {frame}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => onOpen(clip, kind, e.currentTarget)}
      className={shell}
    >
      {frame}
    </button>
  );
}

/**
 * The player.
 *
 * The iframe exists only while this is mounted, and that is the decision the
 * page rests on. Embedding every tile up front would pull YouTube's player
 * JavaScript in once per clip on first paint, which on the cheap phone in an
 * in-app browser that much of this traffic arrives from is the difference
 * between a page and a stall. Thumbnails are nearly free; players are not.
 *
 * `youtube-nocookie.com` because it sets no tracking cookie until playback
 * actually starts.
 */
function Player({
  playing,
  onClose,
}: {
  playing: Playing;
  onClose: () => void;
}) {
  const { clip, kind } = playing;
  const lenis = useOptionalLenis();
  const panel = useRef<HTMLDivElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButton.current?.focus();

    // Hold the page behind the veil. Two mechanisms, because there are two
    // possible drivers: `overflow` stops a natively scrolling page, and Lenis —
    // which runs its own RAF loop against its own wrapper and would carry on
    // scrolling underneath regardless of what `body` says — has to be told
    // separately. Whichever one is in charge, one of these reaches it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog. Without this the next stop is a tile behind
      // the veil, which cannot be seen and yet takes the focus ring.
      const stops = panel.current?.querySelectorAll<HTMLElement>(
        "button, iframe, [href]",
      );
      if (!stops?.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      lenis?.start();
    };
  }, [onClose, lenis]);

  const when = formatWhen(clip.publishedAt);
  const duration = formatDuration(clip.seconds);
  const meta = [duration, when].filter(Boolean).join("  ·  ");

  return (
    // Ink with a blur under it, the same idea the age gate uses — but its own
    // class, because the gate's wash is tuned for a dark photographic ground and
    // over paper it is far too pale. See `.player-veil` in globals.css.
    <div
      className="player-veil fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={clip.title}
        className="relative w-full max-w-[880px]"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close the player"
          className="absolute -top-9 right-0 grid h-8 w-8 place-items-center text-[var(--color-paper)] hover:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* A vertical player is capped by height rather than width, or a Short
            on a phone runs off both ends of the screen. */}
        <div
          className={`mx-auto overflow-hidden rounded-[4px] bg-[#0e120f] ${
            kind === "short"
              ? "aspect-[9/16] h-[74vh] w-auto max-w-full"
              : "aspect-video w-full"
          }`}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${clip.id}?autoplay=1&rel=0`}
            title={clip.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>

        <p className="mt-3 text-center font-[family-name:var(--font-body)] text-[14px] font-semibold text-[var(--color-paper)]">
          {clip.title}
        </p>
        {meta && (
          <p
            className={`${EYEBROW} mt-1 text-center text-[10px] text-[var(--color-paper)] opacity-70`}
          >
            {meta}
          </p>
        )}
      </div>
    </div>
  );
}
