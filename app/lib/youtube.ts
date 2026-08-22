import data from "./youtube-data.json";

/** One upload, as the build snapshot stores it. */
export type Clip = {
  id: string;
  title: string;
  publishedAt: string;
  /** Null where the API reported no usable length, e.g. a live broadcast. */
  seconds: number | null;
  /** A `public/` path. Pass through `asset()` before it reaches the DOM. */
  thumb: string;
};

export type Snapshot = {
  /** When the snapshot was last refreshed, or null if it never has been. */
  fetchedAt: string | null;
  shorts: Clip[];
  videos: Clip[];
};

/**
 * The committed snapshot, written by `scripts/fetch-youtube.mjs` at build time.
 *
 * Imported rather than fetched: `output: "export"` means there is no server to
 * ask at runtime, and this data is small enough that inlining it costs less
 * than a request would.
 */
export const snapshot = data as Snapshot;

/**
 * Whether there is anything to watch.
 *
 * Read by the landing page as well as by `/watch`. The channel can be empty —
 * it was when this was built — and an empty `/watch` is a worse destination
 * than the channel itself, so the plate's button chooses its target on this.
 */
export const hasClips = snapshot.shorts.length + snapshot.videos.length > 0;

/** `552` to `"9:12"`, `3723` to `"1:02:03"`. Null for an unknown length. */
export function formatDuration(seconds: number | null): string | null {
  if (typeof seconds !== "number" || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * "10 days ago".
 *
 * Must only ever be called from the client. Computed during a static export it
 * would be frozen at build time and start lying immediately — "10 days ago"
 * would still read as ten days ago a year later.
 */
export function formatWhen(publishedAt: string): string | null {
  const then = Date.parse(publishedAt);
  if (Number.isNaN(then)) return null;

  const seconds = (Date.now() - then) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return rtf.format(0, "minute");
}
