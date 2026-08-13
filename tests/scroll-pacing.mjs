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

const geometry = await page.evaluate(() => {
  const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
  return {
    scrollable: wrap.scrollHeight - wrap.clientHeight,
    viewport: wrap.clientHeight,
  };
});

const viewports = geometry.scrollable / geometry.viewport;

// One flick of a thumb covers roughly half a screen of travel plus momentum. At
// a single viewport of scroll the whole opening was over in one gesture; two and
// a half means the plate arrives, holds, and opens across separate gestures.
check(
  "transition has more than 2 viewports of scroll to play across",
  viewports > 2,
  `${viewports.toFixed(2)} viewports (${geometry.scrollable}px)`,
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
  return page.evaluate(async (f) => {
    const wrap = document.querySelector(".fixed.inset-0.overflow-y-auto");
    wrap.scrollTop = (wrap.scrollHeight - wrap.clientHeight) * f;
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
  }, fraction);
}

// 50 is a shut panel, 0 is fully retracted. The plate spends the first stretch
// riding up behind a solid panel, so the mask must still be closed there.
const early = await apertureAt(0.2);
check("panel is still shut while the plate rides up", early === 50, `mask=${early}`);

// The documented gesture is "rides up, holds a beat, then is eaten away from the
// centre". The hold is the part that only exists if the panel is still shut after
// the plate has already landed — the plate pins 0.39 of the way along and the
// opening starts at 0.47, so 0.44 is inside the beat.
const held = await apertureAt(0.44);
check("panel still holds shut after the plate lands", held === 50, `mask=${held}`);

// Partway open, not snapped: the letterbox stage.
const mid = await apertureAt(0.72);
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
