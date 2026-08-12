# Deployment Weight & Meta Webview Performance Assessment

**Project:** yrsa-scaffold (Next.js 16.3.0 / React 19.2.8, Turbopack)
**Target host:** Hostinger + custom domain
**Critical viewing context:** Meta in-app browser (Instagram / Facebook webview), mid-to-low-tier iPhone and Android
**Date:** 2026-08-11
**Revision:** 3 — re-measured after the second pass (new handwritten mark from `logo2.png`, smaller everywhere; all hero type removed; the "Work" plate removed so the hero scrolls straight to Members). The site is now two screens: footage, then the way in.

All figures below are measured from a real `next build` of this repository, not estimated. Assets that exist on disk but are never referenced by the code are excluded from the deployed totals and listed separately in §7.

---

## 1. Executive summary

| Metric | Value |
|---|---|
| **Total deployed payload (all files uploaded to Hostinger)** | **≈ 6.3 MB** |
| Code payload (HTML + JS + CSS, compressed, first visit) | **≈ 246 KB** |
| Media payload (referenced images + video only) | **≈ 5.40 MB** |
| Heaviest single asset | `hero.mp4` — 3.63 MB (**67% of all media**, 58% of the entire site) |
| Dead weight currently on disk, excluded | ≈ 3.96 MB (11 unused JPEGs, 1 unused MP4, old logo, 5 template SVGs) |
| Landing-page bytes needed before first paint | ≈ 394 KB (HTML + CSS + hero poster) |
| Landing-page bytes needed before hero video plays | ≈ 4.3 MB |
| Routes | 2 real (`/`, `/members`), both fully prerendered static |
| Landing page height | 2 screens (hero → members) |

**The headline:** the code is lean and will not be the problem. The media is the entire story. **One video is now 67% of all media**, and no image in the project passes through any optimization pipeline. In a Meta webview on a 4G connection with an older phone, this is the difference between a 2-second and a 12-second experience.

Two rounds of restructuring have helped a lot. The landing page's HTML is now less than a third of what it was (78.9 KB → 25.3 KB raw), and the deployed media set has fallen from 7.54 MB to 5.40 MB. But each round also *orphaned* more files rather than removing them — the unused pile has grown from 1.63 MB to 3.96 MB and is now **larger than everything on the page except the hero video**. The remaining problem is unusually concentrated: two actions, neither touching application code, fix most of it.

---

## 2. Code payload — precise breakdown

### 2.1 JavaScript

`.next/static/chunks/`, 12 chunks:

| Measure | Value |
|---|---|
| **Total raw** | **768,542 B (750 KB)** |
| **Total gzipped** | **235,870 B (230 KB)** |

The bulk is React 19 runtime + Next.js client runtime + `framer-motion` + `lenis`. `framer-motion` and `lenis` together are the only discretionary portion — everything else is the framework floor.

**This number has now barely moved across two rounds of deleting content** — the footer, a 286-line archive page, three stack sections and all the hero type are gone, and the JS fell by less than 1 KB. **The weight is in the dependencies, not the page code.** No amount of trimming components will reduce it; only dropping a library would.

### 2.2 CSS

Single Tailwind v4 bundle: **5,437 B gzipped**. Negligible. No action needed.

### 2.3 HTML (prerendered, static)

All routes built as `○ (Static)` — fully prerendered, no server rendering at request time:

| Route | Raw | Gzipped |
|---|---|---|
| `/` | 25,290 B | **4,267 B** |
| `/members` | 11,785 B | **3,504 B** |

The raw HTML embeds the React Server Component payload inline, but it is repetitive text and gzips by ~83%. A non-issue.

### 2.4 Code total, first visit to `/`

```
HTML (gzip)      4.3 KB
CSS  (gzip)      5.4 KB
JS   (gzip)    230.3 KB
              ─────────
               240.0 KB
```

**Verdict:** ≈ 246 KB of code including manifests. Healthy for a motion-heavy Next.js site, and not what will hurt you.

---

## 3. Media payload — the real weight

### 3.1 Referenced assets only (these ship)

**Video (1 file, 3,632,318 B / 3.46 MB)**

| File | Size | Where used |
|---|---|---|
| `hero.mp4` | 3,632,318 B (3.46 MB) | `Hero.tsx` autoplay, **and** the loader's final frame — the shot that scales up into the landing page |

With the "Work" plate gone, `film.mp4` is no longer used anywhere. **The site now ships exactly one video, and it is 67% of all media.**

**Images (9 files, 1,768,908 B / 1.69 MB)**

| File | Size | Where used |
|---|---|---|
| `hero-poster.jpg` | 384,316 B | Hero + loader video poster |
| `reel/02-bisbee.jpg` | 278,038 B | loading reel |
| `reel/03-cabot-overlook.jpg` | 257,426 B | loading reel |
| `reel/06-florida.jpg` | 196,944 B | loading reel |
| `reel/05-cabot-water.jpg` | 170,117 B | loading reel |
| `reel/04-peggys-cove.jpg` | 153,406 B | loading reel |
| `members.jpg` | 143,565 B | "Members" plate |
| `reel/01-arizona.jpg` | 138,577 B | loading reel |
| `logo-yrsa2.png` | 46,519 B | the mark (mask source) |

**Referenced media total: 5,401,226 B ≈ 5.40 MB.**

Note the shape of this: **the six loading-reel frames are 1.19 MB — 70% of all image weight — and they are shown for about three seconds, once, before the visitor sees the site.** The two images that constitute the actual page (`hero-poster.jpg` and `members.jpg`) total 528 KB. If the payload needs to come down beyond the hero video, the reel is the next place to look, not the page.

The new mark is also cheaper than the old one: `logo-yrsa2.png` is 46.5 KB against the previous 87.1 KB, because trimming the 2000×2000 source to its letters removed a canvas that was 92% empty.

### 3.2 The optimization gap — the single most important finding

Every image rendered as a page background uses a **raw `<img>` tag**, not `next/image` (`StackSection.tsx:126`). The loading reel does use `next/image`, so it gets WebP/AVIF and `srcset` in development — but see the caveat below.

This means, for the plate backgrounds:

- **No WebP or AVIF conversion.** These are baseline JPEGs. WebP at visually equivalent quality typically lands 25–35% smaller; AVIF, 40–50%.
- **No responsive `srcset`.** A 390 px-wide phone downloads the exact same file a desktop does.
- **No automatic lazy-loading semantics** beyond what the browser infers.

And critically: `next/image`'s on-demand optimizer **requires a Node.js server**. On Hostinger shared hosting as static files (§4), it is unavailable — which means even the loading reel's `<Image>` components fall back to serving the original JPEGs untouched. **On a static export, nothing is optimized automatically.** It has to be baked in at build time or by hand, before upload.

**Realistic recovery from this one area: 5.95 MB → ~2.3–2.6 MB, with no visible quality loss on a phone.**

### 3.3 `members.jpg` — a resolution caveat

`members.jpg` (copied from `Content/memberspic.jpeg`) is **665 × 1182** — a portrait phone shot. It is used full-bleed via `object-cover` on an `h-dvh w-full` plate. Consequences:

- **On a phone (390 × 844 CSS px):** the source is close to the required pixel count. Acceptable, and the framing works — full body visible, face centred.
- **On desktop (1440 × 900):** the image is upscaled ~2.2× and looks soft, and because a portrait source cropped to a landscape viewport keeps only a vertical slice, **the crop lands on the torso and cuts the head off entirely.** Verified in the browser.

Since the Instagram audience is overwhelmingly mobile this is a defensible trade, but it is a real desktop defect. Two cheap options: supply a higher-resolution and/or landscape crop for wide viewports, or add `object-position: top` to bias the crop toward the face. The second is one line but changes framing on mobile too, so it is a composition decision rather than a technical one.

---

## 4. Hostinger deployment shape — decide this first

### Option A — Shared / Premium / Business hosting (static export)

Apache/LiteSpeed serving files from `public_html`. Requires adding to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
```

**This is viable.** Both routes build as `○ (Static)`, and the age gate is pure `sessionStorage` (`app/members/ageVerification.ts` — no cookies, no route handler), so nothing in the app needs a server. Upload the contents of `out/`.

One consequence worth naming: the gate is now scoped to a **browsing session** rather than a device. In a Meta in-app webview, which clears storage aggressively between visits (§5.1), that effectively means **the gate will be shown on nearly every visit from Instagram** — which is likely the desired behaviour for an adult-content gate, but it is a deliberate choice rather than an accident.

- ✅ Cheapest, fastest; LiteSpeed serves static files very well
- ✅ Zero cold starts, no Node process to crash
- ❌ `next/image` optimization unavailable — you must pre-optimize media yourself

### Option B — Hostinger VPS with Node.js

Run `next start` behind Nginx.

- ✅ `next/image` works — automatic WebP/AVIF and `srcset`, solving §3.2 at the platform level
- ❌ More expensive; needs PM2/systemd, TLS, ongoing maintenance
- ❌ A small VPS becomes the bottleneck under a spike from an Instagram post

**Recommendation: Option A plus a build-time image pipeline.** The site is 10 images and 2 videos — a fixed, small, known set. Paying for and maintaining a VPS to optimize twelve files is worse value than optimizing them once.

### Hostinger-specific configuration to verify

1. **Compression must be on.** Confirm LiteSpeed/Apache gzip or Brotli for `text/html`, `application/javascript`, `text/css`. Without it the JS payload is 751 KB instead of 230 KB — a 3.3× regression. **The single most important server setting.**
2. **Cache headers.** `/_next/static/` filenames are fingerprinted → `Cache-Control: public, max-age=31536000, immutable`. Give `/media/*` 30 days+.
3. **HTTP/2 or HTTP/3**, so the ~15 asset requests multiplex rather than queue.
4. **Free SSL + force HTTPS.** Non-negotiable — an autoplay video served over HTTP inside an HTTPS page is simply blocked.
5. **Domain/DNS.** Point the custom domain at Hostinger's nameservers; allow 24–48 h propagation. Test the live domain *inside the Instagram app*, not just desktop Chrome.
6. **CDN.** Hostinger's CDN (or Cloudflare in front) matters more than usual — the Instagram audience is geographically spread while the origin is one datacenter.

---

## 5. Meta webview behavior — the environment this actually runs in

Traffic from an Instagram bio link or story does **not** open Safari or Chrome. It opens Meta's embedded webview.

### 5.1 What the webview changes

**Engine.** iOS uses `WKWebView` (same WebKit as Safari), so rendering fidelity is good. Android uses Android System WebView (Chromium), which on neglected devices lags several releases behind Chrome.

**Cache is weak and short-lived.** Webview storage is aggressively cleared and not shared with the user's real browser. **Assume most visits are cold.** This is the most consequential fact here: the full ~4.3 MB above-the-fold cost is paid on *nearly every visit*, not amortized across return visits. Long `Cache-Control` headers help far less than analytics on a normal site would suggest.

**Injected scripts.** Meta injects its own navigation chrome and analytics into the page context, competing for main-thread time on exactly the devices least able to spare it.

**Startup overhead.** The webview process spins up alongside the page load — the first ~200–400 ms of perceived load is the container, before your first byte.

### 5.2 Autoplay video in the webview — the highest-risk area

The site autoplays video in two places now: `Hero.tsx` and the loader's final frame. (`StackSection.tsx` still has a video branch, but no section passes `media` any more, so it is dead at runtime.) **Both carry `muted` and `playsInline` — verified in the source.** That is the correct baseline. Remaining risks:

- **`Hero.tsx` unmutes on first interaction** (`v.muted = false` on `pointerdown`/`keydown`/`wheel`/`touchstart`). On a phone, the first touch is usually a *scroll* — so audio can begin unexpectedly while the visitor is just scrolling. Worth considering whether that is the intent in a webview context, where unexpected audio is a common reason people close a page.
- **iOS Low Power Mode blocks autoplay entirely**, and many older iPhones live there. `hero-poster.jpg` is therefore not a fallback — it is the actual hero image for a real slice of the audience, and the loader's scale-up will show a still frame growing rather than moving footage. **Now that all hero type has been removed, that poster is the entire first screen for those visitors: one still image, no words.** It deserves to be treated as the most important image on the site.
- **Meta's Data Saver mode** may defer or block media loads.
- **`hero.mp4` is now decoded twice on the landing page** — once in the loader's growing frame and once in `Hero.tsx` underneath it. Same file, so no extra download, but two simultaneous decodes of a 3.46 MB video during the most animation-heavy moment of the page is real work for an older phone. Consider whether the loader's frame could hand off to the Hero element instead of both being live.

### 5.3 Scroll-jacking risk

The project uses **`lenis`** (`app/context/ScrollContext.tsx`). This is the second-highest risk after video weight. Momentum-scroll libraries hijack the native scroll thread and re-implement it on the main thread. In a Meta webview:

- The webview has its own pull-to-dismiss and edge gestures, which a JS scroll layer can fight — reading as "broken" rather than "smooth."
- On a device already decoding video and 2 MB of JPEG, the scroll loop misses frames. Smooth scroll below ~50 fps feels *worse* than native, not better.

**Recommendation:** feature-detect and disable `lenis` on low-end/webview conditions, falling back to native scroll. `app/lib/useReducedMotionSafe.ts` is the right hook to extend. Note the provider already degrades gracefully for `prefers-reduced-motion` (it sets `lerp: 1` and disables `smoothWheel`) — the same pattern extended to a device-capability check is the fix.

### 5.4 Framer Motion on weak hardware

The restructure improved this: the loader's centre-out mask (four composited gradients rebuilt every frame) has been **replaced by a single `transform: scale` + `translate`** on the growing frame. That is GPU-composited and materially cheaper than the mask it replaced — a genuine win on older phones.

The mask still runs in `StackSection.tsx` (`Aperture`), scrubbed by scroll — but there is now **one plate instead of four**, so a quarter of the original cost. Combined with the hero type removal (no `RevealText` on the first screen), the opening is materially lighter on the main thread than it was two revisions ago.

Remaining watch items: animating `filter`, `blur`, `box-shadow`, or `backdrop-filter` forces main-thread paint every frame — `Aperture.tsx` and `RevealText.tsx` are worth auditing. `HoverRoll.tsx` is now unused anywhere in the app (it went with the header links) and is dead code.

---

## 6. Latency projections

Assumptions: cold cache (per §5.1), gzip enabled, HTTP/2, Hostinger CDN edge, one 3G/4G RTT ≈ 100–200 ms.

### 6.1 Landing page, as it stands today

| Scenario | Device | First paint | Hero poster visible | Hero video playing | Fully loaded |
|---|---|---|---|---|---|
| WiFi (~50 Mbps) | Recent iPhone | 0.6–1.0 s | 1.0–1.4 s | 1.7–2.4 s | ~2.3 s |
| Good 4G (~15 Mbps) | iPhone 11-class | 1.1–1.7 s | 1.9–2.6 s | 3.8–5.0 s | 5.5–6.5 s |
| Average 4G (~6 Mbps) | iPhone 8 / mid Android | 1.7–2.6 s | 3.2–4.5 s | 7–10 s | 11–13 s |
| Weak 4G / congested (~2 Mbps) | Budget Android | 2.8–4.5 s | 6–9 s | 18–26 s | 27 s+ |

**Code delivery is fine in every row.** The degradation is entirely media, and it compounds — the reel JPEGs compete with `hero.mp4` for the same bandwidth.

**One timing note specific to the new loader:** the sequence runs on a fixed 3400 ms clock (`LOAD_MS`) followed by a 1700 ms scale-up, regardless of whether the media has arrived. On the bottom two rows, `hero.mp4` will **not** have loaded by the time the frame starts growing, so the growth plays on `hero-poster.jpg` and the video begins mid-zoom or after. It degrades gracefully rather than breaking — but the loader is a fixed-length animation, not a real progress indicator, and the counter running 0→100 implies otherwise.

### 6.2 Same page after the §8 optimizations

| Scenario | First paint | Hero visible | Hero video playing | Fully loaded |
|---|---|---|---|---|
| Good 4G | 0.9–1.4 s | 1.2–1.7 s | 1.9–2.7 s | 3.5–4.5 s |
| Average 4G | 1.4–2.0 s | 1.8–2.5 s | 3.2–4.5 s | 6–7 s |
| Weak 4G | 2.3–3.6 s | 3.2–4.5 s | 6–9 s | 12–14 s |

Roughly a **2× improvement on the metrics that decide whether a visitor stays**, achieved entirely through media work — no architectural change, no host upgrade.

### 6.3 Main-thread cost (independent of network)

On an iPhone 8 or budget Android, parsing and executing 751 KB of raw JavaScript costs roughly **500–900 ms of blocked main thread** after download. During that window taps do nothing and scroll does not respond. Add `lenis` initialization and Framer Motion's first frame, and Time to Interactive on a weak device is realistically **3–5 s even on fast WiFi**. This is a hardware ceiling, not a bandwidth one — no CDN fixes it, only shipping less JavaScript.

---

## 7. Excluded from all figures above (unused assets)

Present in `public/` but referenced nowhere in `app/` — verified by grepping every file against the source. **Do not upload these.**

| File | Size | Note |
|---|---|---|
| `media/studio-bisbee.jpg` | 585,123 B | never used |
| `media/studio-feed.jpg` | 502,891 B | orphaned (was the Studio plate) |
| `media/stills-cabot-2.jpg` | 460,279 B | never used |
| `media/personal-detail.jpg` | 434,884 B | orphaned (was on the old archive page) |
| `media/personal-portrait.jpg` | 329,803 B | orphaned (was on the old archive page) |
| `media/stills-cabot-1.jpg` | 299,825 B | never used |
| `media/stills-peggys-cove.jpg` | 285,387 B | never used |
| `media/members-teaser.jpg` | 282,568 B | orphaned (replaced by `members.jpg`) |
| `media/film.mp4` | 254,559 B | **newly orphaned** — the "Work" plate was its only use |
| `media/stills-arizona.jpg` | 251,893 B | **newly orphaned** — was the "Work" plate poster |
| `media/archive-entrance.jpg` | 182,136 B | orphaned (was on the old archive page) |
| `media/logo-yrsa.png` | 87,121 B | **newly orphaned** — replaced by `logo-yrsa2.png` |
| `next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg` | 3,314 B | Next.js template leftovers |
| **Total** | **3,959,783 B (3.96 MB)** | |

Deleting these cuts `public/` from 9.36 MB to 5.40 MB — **a 42% reduction for zero effort and zero risk.**

This pile has grown every round: 1.63 MB → 3.37 MB → 3.96 MB. It is now **larger than every asset on the live site except the hero video**, and bigger than the entire rest of the page combined. Nothing references these files, so nothing breaks when they go. If only one item from this document gets done, it should be this one — it is a `rm` with no code change and no risk.

Keep the originals in `Content/` if they may be wanted later; `public/` should hold only what the site actually serves.

`app/components/Footer.tsx` is also no longer rendered anywhere. It was left in place deliberately (the footer was removed "for now"), so it costs nothing at runtime — tree-shaken out of the bundle — but it is dead code until the footer returns.

Also excluded, as working directories that must never reach the server:

| Directory | Size |
|---|---|
| `Content/` | 122 MB (source media) |
| `Notes/` | 16 MB (working notes — including this file) |
| `logo/` | 10 MB (source logo artwork) |

**These three total ~148 MB — over 20× the entire real website.** Confirm they are excluded from whatever upload method is used. If deploying by dragging a folder into Hostinger's File Manager or by FTP, this is an easy and expensive mistake.

⚠️ **All three are currently tracked in git** (staged in the initial commit — verified via `git status`). `.gitignore` does not cover them. That matters for two reasons:

1. If deployment ever runs from a Git clone or a CI checkout, those 148 MB come with it by default.
2. `Notes/` contains working material — including `Changes to be made - Webpage 2.pdf` and this file — and `Content/` holds the full unpublished source library. Neither is intended to be public. **If this repository is ever pushed to a public remote, that content is published.** Worth adding them to `.gitignore` and `git rm --cached` before any remote is added.

---

## 8. Recommendations, ordered by impact per unit of effort

### Tier 1 — do before launch

1. **Delete the 3.96 MB of unused assets** (§7). Zero risk, no code change, and it is now the largest single item on this list after the video. Do this first because it costs nothing.
2. **Compress `hero.mp4`.** 3.63 MB is 67% of all media, and it is decoded twice on the landing page. Re-encode at H.264 High, CRF 26–28, 720p (a phone cannot resolve more), with `-movflags +faststart` so playback begins before the file finishes downloading. Target **under 1.2 MB**. Add a WebM/VP9 source for Android. *Saves ~2.4 MB — more than any other single action.*
3. **Convert the 9 referenced images to WebP** with JPEG fallback at quality 78–82. *Saves ~0.4–0.6 MB.* The six loading-reel frames are the bulk of this (§3.1) — and since they are seen once, briefly, before the site appears, they tolerate more aggressive compression than the page images do.
4. **Generate responsive sizes** (400 / 800 / 1600 px) with `srcset` + `sizes` so phones stop downloading desktop-resolution files.
5. **Confirm gzip/Brotli is enabled on Hostinger.** Without it the code payload triples.
6. **Decide on `members.jpg` at desktop width** (§3.3) — currently the head is cropped out above ~1000 px wide.

### Tier 2 — do soon after

7. **Reconsider the Hero unmute-on-first-interaction** (§5.2). A scroll gesture triggering audio in an Instagram webview is a common bounce cause.
8. **`loading="lazy"` on the below-the-fold plate images**, and `fetchpriority="high"` on `hero-poster.jpg` only.
9. **Gate `lenis` behind a capability check**; fall back to native scroll in webviews and on low-end devices (§5.3).
10. **Avoid decoding `hero.mp4` twice** — have the loader's frame hand off to the Hero element rather than both running live.
11. **Set explicit `width`/`height` on the plate images** to eliminate layout shift.
12. **Audit animations for `filter`/`blur`/`box-shadow`/`backdrop-filter`** (§5.4).

### Tier 3 — worthwhile refinements

13. **Make the loader honest, or make it shorter.** It is a fixed 3400 ms + 1700 ms animation with a counter that implies real progress. Either drive the counter off actual media readiness, or shorten it — on a fast connection it is 5.1 s of enforced waiting before the visitor sees the site.
14. Consider whether `framer-motion` belongs on the critical path, or whether above-the-fold animation can be CSS while it loads lazily. This is the only meaningful lever on the 230 KB JS figure.
15. Add a blur-up or dominant-colour placeholder for hero media.
16. Enable Hostinger CDN or front with Cloudflare.
17. **Test on a real iPhone SE and a real budget Android inside the Instagram app**, on cellular with WiFi off. Desktop DevTools throttling does not reproduce webview cache behaviour or thermal throttling.

---

## 9. Bottom line

The site will deploy to Hostinger cleanly as a static export, and the codebase is in good shape — ~240 KB of compressed code across two prerendered routes, with no server required and the age gate working entirely client-side (verified across five states: it appears on a fresh session, holds within that session, and returns on the next one).

The performance question is **5.40 MB of unoptimized media flowing through the worst-case delivery environment**: a Meta webview with a near-useless cache, on a phone that may be several hardware generations old, over cellular. Because that cache is unreliable, this cost is paid on nearly every visit rather than once.

Two rounds of restructuring have done real good — media down from 7.54 MB to 5.40 MB, HTML down to under a third, one aperture mask instead of four, a GPU-composited loader transition instead of a per-frame mask, and a logo file that is half the size of the one it replaced. The site is now about as lean as its *structure* can make it; the JS has stopped responding to content cuts entirely.

What remains is unusually concentrated, and none of it requires touching application code:

- **One video is 67% of all media** → compressing it saves ~2.4 MB
- **The unused pile is 3.96 MB** → deleting it saves all of that
- **The loading reel is 70% of image weight** for three seconds of screen time

Those three take the deployed payload from 6.3 MB to roughly **2.4 MB**, and cut perceived load time by more than half, with no change a visitor would read as lower quality. The non-negotiable correctness items remain server compression and the DNS/SSL setup. Everything else is a matter of degree.
