/**
 * Guards `/watch`: the two rows, and the one decision the page's usability
 * rests on — that no YouTube player exists until a tile is clicked.
 *
 * Two modes, because the committed snapshot can legitimately be empty (it was
 * when this was written — the channel had no public uploads):
 *
 *   node tests/watch.mjs             assert whatever the snapshot produces,
 *                                    plus the checks that need no browser
 *   node tests/watch.mjs --fixture   swap in fixture data, rebuild, assert the
 *                                    rows and the player, then restore
 *
 * Fixture mode is the one that proves the rows work. Without it an empty
 * snapshot makes every row assertion pass by never running, which is worse than
 * no test at all.
 *
 * Fixture mode leaves `out/` holding the fixture build — rerun `npm run build`
 * afterwards before trusting the export.
 *
 * Run against a built export:
 *   npm run build && node tests/watch.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, extname } from "node:path";
import {
  classify,
  parseIsoDuration,
  OVERRIDES,
} from "../scripts/youtube-classify.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "out");
const DATA = join(ROOT, "app/lib/youtube-data.json");
const THUMBS = join(ROOT, "public/media/youtube");
const PORT = 8913;
const FIXTURE = process.argv.includes("--fixture");

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* ---------- checks that need no browser ---------- */

check("a 45-second upload is a short", classify("a", 45) === "short");
check("a nine-minute upload is a video", classify("b", 552) === "video");
check(
  "three minutes is the boundary, inclusive",
  classify("x", 180) === "short" && classify("x", 181) === "video",
);
check(
  "a live broadcast reports no usable length",
  parseIsoDuration("P0D") === null,
  String(parseIsoDuration("P0D")),
);

// An override has to beat the duration rule, or a misfiled landscape clip could
// never be rescued.
OVERRIDES["override-me"] = "video";
check(
  "an override beats the duration rule",
  classify("override-me", 45) === "video",
);
delete OVERRIDES["override-me"];

// The fallback: a build must survive a missing key without touching the
// snapshot, because the snapshot is what it then compiles against.
const committed = await readFile(DATA, "utf8");
const keyless = spawnSync("node", [join(ROOT, "scripts/fetch-youtube.mjs")], {
  encoding: "utf8",
  env: { ...process.env, YOUTUBE_API_KEY: "" },
});
check("a keyless fetch exits zero", keyless.status === 0, `exit=${keyless.status}`);
check(
  "a keyless fetch leaves the snapshot byte-identical",
  (await readFile(DATA, "utf8")) === committed,
);

// Every thumbnail the snapshot names must exist, or the fallback renders
// against files that are not there.
const named = (() => {
  const s = JSON.parse(committed);
  return [...s.shorts, ...s.videos];
})();
const missing = [];
for (const clip of named) {
  if (!(await stat(join(ROOT, "public", clip.thumb)).catch(() => null))) {
    missing.push(clip.thumb);
  }
}
check(
  "every thumbnail the snapshot names exists on disk",
  missing.length === 0,
  missing.length ? missing.join(", ") : `${named.length} named`,
);

/* ---------- fixture ---------- */

// A 1x1 JPEG. These assertions are about structure and behaviour, not pixels;
// what matters is that the file resolves rather than 404s.
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHR" +
    "ofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QA" +
    "FAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAA" +
    "AAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmAA/9k=",
  "base64",
);

/**
 * A full row of each, not a token two.
 *
 * The chevrons disable themselves when a row has nowhere to scroll, which is
 * correct behaviour and which a two-tile fixture triggers — the row fits, the
 * button is properly disabled, and the assertion that it scrolls can never
 * pass. Twelve is what the build actually keeps per row, so the fixture matches
 * the real thing and overflows at any viewport.
 */
const PER_ROW = 12;
const pad = (n) => String(n).padStart(2, "0");
const fixtureClip = (kind, n) => ({
  id: `fix${kind}${pad(n)}`,
  title: `Fixture ${kind.toLowerCase()} ${pad(n)}`,
  publishedAt: "2026-08-12T10:00:00Z",
  seconds: kind === "Short" ? 45 : 552,
  thumb: `/media/youtube/fix${kind}${pad(n)}.jpg`,
});
const fixtureShorts = Array.from({ length: PER_ROW }, (_, i) =>
  fixtureClip("Short", i + 1),
);
const fixtureVideos = Array.from({ length: PER_ROW }, (_, i) =>
  fixtureClip("Video", i + 1),
);
const FIRST = fixtureShorts[0];

async function writeFixture() {
  await mkdir(THUMBS, { recursive: true });
  for (const clip of [...fixtureShorts, ...fixtureVideos]) {
    await writeFile(join(THUMBS, `${clip.id}.jpg`), PIXEL);
  }
  await writeFile(
    DATA,
    `${JSON.stringify(
      {
        fetchedAt: "2026-08-22T00:00:00Z",
        shorts: fixtureShorts,
        videos: fixtureVideos,
      },
      null,
      2,
    )}\n`,
  );
}

async function restoreFixture() {
  await writeFile(DATA, committed);
  for (const clip of [...fixtureShorts, ...fixtureVideos]) {
    await unlink(join(THUMBS, `${clip.id}.jpg`)).catch(() => {});
  }
  console.log("\n[fixture] snapshot and thumbnails restored");
}

/* ---------- run ---------- */

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

let server;
let browser;

try {
  if (FIXTURE) {
    console.log("\n[fixture] swapping in fixture data and rebuilding\n");
    await writeFixture();
    const built = spawnSync("npx", ["next", "build"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, YOUTUBE_API_KEY: "" },
    });
    check("the fixture build succeeds", built.status === 0, `exit=${built.status}`);
    if (built.status !== 0) {
      console.error(built.stdout?.slice(-2000), built.stderr?.slice(-2000));
    }
  }

  server = createServer(async (req, res) => {
    let path = join(OUT, decodeURIComponent(req.url.split("?")[0]));
    try {
      if ((await stat(path).catch(() => null))?.isDirectory()) {
        path = join(path, "index.html");
      }
      const body = await readFile(path);
      res.writeHead(200, {
        "content-type": TYPES[extname(path)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((r) => server.listen(PORT, r));

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

  // Anything the page asks of a third party. `/watch` must reach YouTube only
  // once a tile has been clicked.
  const offsite = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(`http://localhost:${PORT}`)) offsite.push(r.url());
  });

  await page.goto(`http://localhost:${PORT}/watch/`, { waitUntil: "load" });

  const tiles = page.locator("button:has(img)");
  const tileCount = await tiles.count();

  check("the /watch route is served", (await page.locator("main").count()) === 1);
  check(
    "no player iframe exists before a click",
    (await page.locator("iframe").count()) === 0,
  );
  check(
    "the page reaches no third party on load",
    offsite.length === 0,
    offsite.slice(0, 3).join(", "),
  );

  if (tileCount > 0) {
    const shortsRow = page.locator("section", {
      has: page.getByRole("heading", { name: "Shorts" }),
    });
    const videosRow = page.locator("section", {
      has: page.getByRole("heading", { name: "Videos" }),
    });

    check("the shorts row renders", (await shortsRow.count()) === 1);
    check("the videos row renders", (await videosRow.count()) === 1);
    check(
      "both rows hold tiles",
      tileCount === PER_ROW * 2,
      `${tileCount} tiles`,
    );

    // Clicking a tile must mount a player for that tile's video.
    await tiles.first().click();
    const frame = page.locator("iframe");
    await frame.waitFor({ timeout: 5000 });
    const src = await frame.getAttribute("src");
    check(
      "clicking a tile mounts a player for that video",
      src?.includes(FIRST.id) ?? false,
      src ?? "no src",
    );
    check(
      "the player is the no-cookie host",
      src?.startsWith("https://www.youtube-nocookie.com/embed/") ?? false,
    );
    check(
      "the dialog is labelled with the video title",
      (await page.locator('[role="dialog"]').getAttribute("aria-label")) ===
        FIRST.title,
    );
    check(
      "the page behind the player is held still",
      (await page.evaluate(() => document.body.style.overflow)) === "hidden",
    );

    await page.keyboard.press("Escape");
    await frame.waitFor({ state: "detached", timeout: 5000 });
    check(
      "escape closes the player and unmounts the iframe",
      (await page.locator("iframe").count()) === 0,
    );
    check(
      "closing gives the page its scrolling back",
      (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    );

    // The chevron drives the same scrollLeft a thumb does.
    const scroller = shortsRow.locator("div.overflow-x-auto").first();
    const before = await scroller.evaluate((el) => el.scrollLeft);
    await shortsRow.getByRole("button", { name: /forward/i }).click();
    await page.waitForTimeout(700);
    const after = await scroller.evaluate((el) => el.scrollLeft);
    check("the chevron advances the row", after > before, `${before} -> ${after}`);

    // At the start of a row there is nowhere to go back to.
    check(
      "the back chevron is disabled at the start of a row",
      await videosRow.getByRole("button", { name: /back/i }).isDisabled(),
    );
  } else {
    check(
      "an empty snapshot renders the empty state, not empty rows",
      (await page.getByText(/just getting started/i).count()) === 1,
    );
    check(
      "the empty state still offers the channel",
      (await page.locator('a[href*="youtube.com"]').count()) >= 1,
    );
    console.log(
      "\nNOTE  the snapshot is empty, so the row and player assertions did not\n" +
        "      run. Use `node tests/watch.mjs --fixture` to exercise them.",
    );
  }
} catch (error) {
  check("the run completes without throwing", false, error.message);
  console.error(error);
} finally {
  // Restore in `finally` or a failed assertion leaves fixture data committed
  // into the working tree, which is exactly what happened the first time.
  await browser?.close().catch(() => {});
  server?.close();
  if (FIXTURE) await restoreFixture();
}

const failed = checks.filter((c) => !c.pass);
console.log(
  `\n${checks.length - failed.length}/${checks.length} passed` +
    (failed.length ? ` — FAILING: ${failed.map((f) => f.name).join(", ")}` : ""),
);
process.exit(failed.length ? 1 : 0);
