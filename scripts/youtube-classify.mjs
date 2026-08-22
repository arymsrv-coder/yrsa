/**
 * Which row an upload belongs in.
 *
 * Shared by the fetch script and `tests/watch.mjs` so the rule is stated once
 * and the test exercises the same code the build runs.
 */

/**
 * The Shorts cutoff.
 *
 * YouTube publishes no flag for whether an upload is a Short — not on
 * `playlistItems`, not on `videos`, nowhere in the Data API. Duration is the
 * only discriminator available, and three minutes is the ceiling YouTube
 * itself imposes on the format.
 */
export const SHORT_MAX_SECONDS = 180;

/**
 * Escapes from the duration rule, by video id.
 *
 * The rule misfiles a genuinely short *landscape* video: it lands in the Shorts
 * row, where a 16:9 frame sits in a 9:16 tile and looks obviously wrong. Rather
 * than make the classifier cleverer — aspect ratio is not on the cheap end of
 * this API — an exception is a one-line edit here.
 *
 *   "dQw4w9WgXcQ": "video",
 */
export const OVERRIDES = {};

/**
 * ISO 8601 duration to seconds.
 *
 * `contentDetails.duration` is the only place the API states length, and it
 * states it as `PT9M12S`. Returns null for anything unparseable — a live
 * broadcast reports `P0D`, which has no length to speak of.
 */
export function parseIsoDuration(iso) {
  if (typeof iso !== "string") return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m;
  const total =
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Math.round(Number(s ?? 0));
  // Zero is not a length, it is the absence of one — `P0D` is what a live
  // broadcast reports. Testing the captures for presence instead would not
  // catch it: the `0` in `P0D` is a non-empty string, so it reads as truthy.
  return total > 0 ? total : null;
}

/** "short" or "video". An override always beats the duration rule. */
export function classify(id, seconds) {
  if (OVERRIDES[id]) return OVERRIDES[id];
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "video";
  return seconds <= SHORT_MAX_SECONDS ? "short" : "video";
}
