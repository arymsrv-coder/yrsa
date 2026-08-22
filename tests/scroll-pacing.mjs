/**
 * Guards the one thing that made the section transition unusable on a phone:
 * how much scrolling the aperture gets to play across.
 *
 * The transition is scrubbed by scroll position, so its pace is set by scroll
 * *distance*, not by a duration. When the whole page was one viewport tall, a
 * single thumb flick crossed the entire three-stage opening in a few hundred
 * milliseconds. Desktop hid this, because the wheel pacing in ScrollContext
 * meant one notch moved a tenth of a screen — but that pacing never applied to
 * touch, so there was nothing slowing a flick down.
 *
 * Run against a built export:
 *   npm run build && node tests/scroll-pacing.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const PORT = 8912;

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

/** Enough of a static host to serve the export, including directory indexes. */
const server = createServer(async (req, res) => {
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

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });

// The loader owns the screen for LOAD_MS plus the growth, and holds the scroll
// stopped while it does. Nothing about scroll length is measurable until it has
// handed over.
await page.waitForFunction(
  () => !document.querySelector('[class*="z-[300]"]'),
  null,
  { timeout: 15000 },
);

/**
 * The stretch of scroll that belongs to the *first* section's transition.
 *
 * Everything below is a fraction of this window rather than of the document,
 * and that distinction only started mattering when the page grew a second
 * section: measured against the whole document, "halfway through the scroll"
 * stopped being the middle of an opening and became the seam between two of
 * them, where the first panel is fully open and the check for a partway-open
 * panel read a hard 0.
 *
 * The window is the section's own scrub — `useScroll` with `start end`/`end end`
 * — so it opens when the track's top reaches the bottom of the viewport and
 * closes when its bottom does. That is one track-height of travel, starting one
 * viewport before the track.
 */
const geometry = await page.evaluate(() => {
  const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
  const track = document.querySelector(".track-height");
  const viewport = wrap.clientHeight;
  // Layout position, not screen position: the rect is relative to the viewport,
  // so the container's own scroll has to be added back.
  const trackTop =
    track.getBoundingClientRect().top -
    wrap.getBoundingClientRect().top +
    wrap.scrollTop;
  return {
    start: trackTop - viewport,
    span: track.offsetHeight,
    viewport,
    scrollable: wrap.scrollHeight - wrap.clientHeight,
  };
});

const viewports = geometry.span / geometry.viewport;
const { start, span } = geometry;

// One flick of a thumb covers roughly half a screen of travel plus momentum. At
// a single viewport of scroll the whole opening was over in one gesture; two and
// a half means the plate arrives, holds, and opens across separate gestures.
check(
  "transition has more than 2 viewports of scroll to play across",
  viewports > 2,
  `${viewports.toFixed(2)} viewports (${geometry.span}px of a ${geometry.scrollable}px page)`,
);

/**
 * How far the aperture is open at a given fraction of total scroll, back in the
 * 50-is-shut / 0-is-open units the component is driven by.
 *
 * Read off the top band's scaleY. The panel is four scaled bands rather than a
 * mask, so the number lives in a transform matrix — `matrix(a, b, c, d, …)`,
 * where `d` is the vertical scale.
 */
async function apertureAt(fraction) {
  return page.evaluate(async ([f, start, span]) => {
    const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
    wrap.scrollTop = start + span * f;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const band = document.querySelector(".z-20")?.firstElementChild;
    if (!band) return null;
    const t = getComputedStyle(band).transform;
    // A shut panel is `scaleY(1)`, which is the identity transform — the browser
    // reports that as `none` rather than a matrix.
    if (t === "none") return 50;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return null;
    const scaleY = parseFloat(m[1].split(",")[3]);
    return Math.round(scaleY * 50 * 10) / 10;
  }, [fraction, start, span]);
}

/**
 * The fraction of the scroll at which the plate stops riding and pins.
 *
 * Read off the DOM rather than derived from the pacing constants: the track's
 * top reaching the top of the viewport is the moment its sticky child stops
 * moving, whatever the constants happen to say.
 */
async function plateLandsAt() {
  return page.evaluate(([start, span]) => {
    const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
    const track = document.querySelector(".track-height");
    const STEPS = 500;
    for (let i = 0; i <= STEPS; i++) {
      wrap.scrollTop = start + (span * i) / STEPS;
      // Sticky offset is layout, not animation, so it is settled by the time
      // the rect can be read — no frame to wait for.
      if (track.getBoundingClientRect().top <= 0.5) return i / STEPS;
    }
    return 1;
  }, [start, span]);
}

/**
 * The fraction at which the mask first comes off its stop.
 *
 * Swept inside the page so the whole scan is one round trip. Starts at 0.3
 * because nothing can have opened before the plate has crossed a screen.
 */
async function panelOpensAt() {
  return page.evaluate(async ([start, span]) => {
    const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
    const band = document.querySelector(".z-20")?.firstElementChild;
    if (!band) return null;
    const STEPS = 140;
    for (let i = 0; i <= STEPS; i++) {
      const f = 0.3 + (0.7 * i) / STEPS;
      wrap.scrollTop = start + span * f;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const t = getComputedStyle(band).transform;
      if (t === "none") continue;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m && parseFloat(m[1].split(",")[3]) * 50 < 49.9) return f;
    }
    return 1;
  }, [start, span]);
}

// 50 is a shut panel, 0 is fully retracted. The plate spends the first stretch
// riding up behind a solid panel, so the mask must still be closed there.
const early = await apertureAt(0.2);
check("panel is still shut while the plate rides up", early === 50, `mask=${early}`);

// The documented gesture is "rides up, holds a beat, then is eaten away from the
// centre". The beat is the part that only exists if the panel is still shut once
// the plate has *already* landed, so both points are measured rather than named.
// A hard-coded fraction cannot express this: the landing and the opening are both
// fractions of the track, so shortening the track slides them together and past
// any number written down here, leaving the check quietly passing on the ride-up
// instead of on the hold.
const lands = await plateLandsAt();
const opens = await panelOpensAt();

check(
  "the panel starts opening only after the plate has landed",
  opens > lands,
  `plate lands at ${lands.toFixed(3)}, opening starts at ${opens.toFixed(3)}`,
);

// And the beat has to be worth something. It also has to absorb the svh/dvh
// discrepancy documented on HOLD_VH in StackSection — the plate pins later in the
// scrub when a mobile browser hides its toolbar, and this run has no toolbar to
// hide — so a hold measured in single percent would not survive a real phone.
const holdVh = (opens - lands) * viewports;
check(
  "the hold is a beat and not a frame",
  holdVh > 0.1,
  `${holdVh.toFixed(3)} viewports of scroll between landing and opening`,
);

const held = await apertureAt(lands + (opens - lands) / 2);
check("panel still holds shut inside the beat", held === 50, `mask=${held}`);

// Partway open, not snapped: the letterbox stage, halfway through the opening.
const mid = await apertureAt(opens + (1 - opens) / 2);
check("panel is partway open mid-scrub", mid > 0 && mid < 50, `mask=${mid}`);

const end = await apertureAt(1);
check("panel is fully open at the end of the scroll", end === 0, `mask=${end}`);

await browser.close();
server.close();

const failed = checks.filter((c) => !c.pass);
console.log(
  `\n${checks.length - failed.length}/${checks.length} passed` +
    (failed.length ? ` — FAILING: ${failed.map((f) => f.name).join(", ")}` : ""),
);
process.exit(failed.length ? 1 : 0);
