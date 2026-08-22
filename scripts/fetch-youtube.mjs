/**
 * Pulls the channel's recent uploads into `app/lib/youtube-data.json` and their
 * thumbnails into `public/media/youtube/`, so the landing page's channel
 * section is built from a local snapshot rather than fetching anything at
 * runtime.
 *
 * Note what a successful fetch does to the stand-ins the snapshot ships with:
 * it replaces them wholesale. That is the intent — the first build that finds
 * real uploads retires the hand-made tiles with nothing to remember to undo.
 * Their image files stay in `public/media/youtube/` unreferenced; they are
 * `standin-*.jpg` and safe to delete once that has happened.
 *
 * Runs as `prebuild`, which means it runs on every deploy — and which is why
 * the one rule it must never break is that it cannot fail a build. A missing
 * key, a network blip, a 403 from a quota reset: all of them leave the
 * committed snapshot exactly where it was and exit zero. The worst case is a
 * slightly stale row. See the note on failing safely below.
 *
 *   YOUTUBE_API_KEY=... node scripts/fetch-youtube.mjs
 */
import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { classify, parseIsoDuration } from "./youtube-classify.mjs";

/**
 * Resolved from the `@YrsaClicks` handle, and confirmed against two independent
 * markers in the channel's own HTML (`channel_id=` and `"externalId"`).
 */
const CHANNEL_ID = "UCo1Zueyx36kh1htZel-ggsg";

/**
 * The uploads playlist is the channel id with `UC` swapped for `UU` — a
 * documented property of the API, and one that saves a `channels.list` call on
 * every build.
 */
const UPLOADS_PLAYLIST = `UU${CHANNEL_ID.slice(2)}`;

/** How many of each kind the two rows hold. */
const PER_ROW = 12;

const ROOT = new URL("..", import.meta.url).pathname;
const DATA_FILE = join(ROOT, "app/lib/youtube-data.json");
const THUMB_DIR = join(ROOT, "public/media/youtube");

/** The public path stored in the JSON. `asset()` adds any base path at render. */
const thumbPath = (id) => `/media/youtube/${id}.jpg`;

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`${path} responded ${res.status} ${res.statusText}`);
  }
  return res.json();
};

/** Every id in the uploads playlist, newest first. 1 quota unit per page. */
async function listUploads() {
  const items = [];
  let pageToken;
  do {
    const page = await api("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: UPLOADS_PLAYLIST,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (!id) continue;
      items.push({
        id,
        title: (item.snippet?.title ?? "").trim(),
        publishedAt:
          item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

/** Durations for a list of ids. 1 quota unit per 50. */
async function durations(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const page = await api("videos", {
      part: "contentDetails",
      id: ids.slice(i, i + 50).join(","),
    });
    for (const v of page.items ?? []) {
      out.set(v.id, parseIsoDuration(v.contentDetails?.duration));
    }
  }
  return out;
}

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

/**
 * Fetch a thumbnail, skipping anything already on disk.
 *
 * Skipping is what lets the committed set and a live fetch coexist instead of
 * fighting: a build with a key tops up what is missing, a build without one
 * leaves the committed files alone.
 *
 * `maxresdefault` does not exist for every upload — `hqdefault` is the one size
 * YouTube guarantees — so a miss falls back rather than failing.
 */
async function fetchThumb(id) {
  const dest = join(THUMB_DIR, `${id}.jpg`);
  if (await exists(dest)) return true;

  for (const size of ["maxresdefault", "hqdefault"]) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) continue;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return true;
  }
  return false;
}

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    // Not an error worth shouting about: a contributor without a key is
    // expected to be able to clone and build.
    console.log(
      "[youtube] YOUTUBE_API_KEY not set — keeping the committed snapshot.",
    );
    return;
  }

  await mkdir(THUMB_DIR, { recursive: true });

  const uploads = await listUploads();
  if (!uploads.length) {
    console.log(
      "[youtube] the channel reports no uploads — keeping the committed snapshot.",
    );
    return;
  }

  const lengths = await durations(uploads.map((u) => u.id));

  const shorts = [];
  const videos = [];
  for (const upload of uploads) {
    const seconds = lengths.get(upload.id) ?? null;
    const bucket = classify(upload.id, seconds) === "short" ? shorts : videos;
    if (bucket.length >= PER_ROW) continue;
    bucket.push({ ...upload, seconds, thumb: thumbPath(upload.id) });
    if (shorts.length >= PER_ROW && videos.length >= PER_ROW) break;
  }

  // A tile with no picture is worse than no tile, so anything whose thumbnail
  // could not be fetched is dropped rather than shipped blank.
  const kept = async (list) => {
    const out = [];
    for (const clip of list) if (await fetchThumb(clip.id)) out.push(clip);
    return out;
  };

  const data = {
    fetchedAt: new Date().toISOString(),
    shorts: await kept(shorts),
    videos: await kept(videos),
  };

  // Written only once everything above has succeeded. An earlier write would
  // mean a mid-way failure left a half-populated snapshot behind, which is the
  // one outcome the fallback exists to prevent.
  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `[youtube] ${data.shorts.length} shorts, ${data.videos.length} videos.`,
  );
}

/**
 * Failing safely.
 *
 * Every path out of `main` that is not a clean success leaves `DATA_FILE` and
 * the thumbnail directory untouched and exits zero. The build then compiles
 * against the committed snapshot, which is why that snapshot — and the images
 * it names — are in the repo rather than being build output.
 */
try {
  await main();
} catch (error) {
  console.warn(
    `[youtube] fetch failed, keeping the committed snapshot — ${error.message}`,
  );
}

// Belt and braces. An unhandled rejection anywhere above would otherwise take
// the build down with a non-zero exit, which is precisely what must not happen.
process.exit(0);
