# The channel, on her own site — `/watch`

Design for a page that holds the channel's recent work as two rows of
thumbnails and plays any of them without sending the visitor to YouTube.

Status: approved, not yet implemented.

## What this replaces

The landing page's second plate (`youtube` in the `sections` array in
`app/page.tsx`) currently wears a `Watch` button whose `href` is
`https://www.youtube.com/@YrsaClicks` with `external: true`. Pressing it ends
the visit. This design keeps the plate exactly as it is and repoints that one
button at a route of our own.

## What it is not

It is not the whole catalogue. Two rows of twelve is recent work; anything
older is reached by a button that still goes to YouTube. The full-archive
version was considered and deliberately deferred — it is a different layout
problem (staying legible at 300 items, and answering for load-in) and it can
be built later against the same data pipeline without rework.

## The channel is empty

Established during implementation, and it shapes several things below.

`UCo1Zueyx36kh1htZel-ggsg` exists but has no public uploads. The Atom feed
returns a valid document with zero `<entry>` elements, and the videos tab,
the Shorts tab and the uploads playlist each report zero. The channel was
created on 2026-08-07.

The screenshot this design started from is therefore a comp rather than a
capture — it shows uploads at "3 weeks ago" and "1 month ago", which predate
the channel itself.

Two consequences. The committed snapshot ships **genuinely empty**: inventing
two dozen plausible videos with invented view counts to make the fallback look
populated would put fabricated work in the one place a visitor decides whether
the real work is worth following. And the empty state is not a defensive edge
case but the live state, so it is designed rather than tolerated, and the
landing page's button routes around it.

## Decisions

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Placement | A `/watch` route, reached from the existing plate | Putting the rows *inside* the pinned plate. Six-plus tiles do not fit a full-bleed poster, and a taller scrolling section at the end of the stack would break the pinned-plate rhythm at exactly the point where the scroll currently comes to rest — and would force a re-tune of `tests/scroll-pacing.mjs`. |
| Ground | Paper | Ink reads better under photography and matches the global `body`. Paper wins on continuity: the channel plate arrives on paper, so following its button stays in the same room rather than cutting to a different one. |
| Data | YouTube Data API v3, fetched at build | The channel RSS feed needs no key but carries no durations, so Shorts and long-form could not be separated into two rows — which is the layout. A hardcoded list costs a commit per upload. |
| Player | One iframe, mounted only on open | Eagerly embedding every tile. See "The player" below; this is the load-bearing choice on the page. |
| Chrome | Her type and palette, no view counts, no overflow menus | Reproducing YouTube's interface. It would read as an embed of YouTube rather than as her channel, inside a site whose entire argument is the two-tone system. |

## Route and ground

`app/watch/page.tsx`, with `app/watch/layout.tsx` carrying metadata. Indexable
— unlike `/members`, which sets `robots: { index: false }`.

`body` is ink globally (`app/layout.tsx`), and `app/members/layout.tsx`
establishes the pattern that a route's layout passes children through while the
page owns its own ground. `/watch` follows it: the page's root element carries
`bg-[var(--color-paper)] text-[var(--color-ink)] min-h-dvh`.

`Header` is **not** used, and cannot be. It consumes `ScrollContext`, whose
`useScrollContext` throws outside a `ScrollProvider`, and mounting that provider
would hand the whole page to Lenis. `/members` already sets the precedent for a
standalone route: place `Logo` directly and scroll natively. `/watch` follows
it, wrapping the mark in a link home.

This is the single most useful thing the implementation turned up, because it
dissolves the design's largest risk rather than mitigating it — with no Lenis on
the route there is no wheel interception to fence off, no `data-lenis-prevent`,
and nothing to stop and start around the player. `Logo` paints as
`currentColor` through a mask, so on paper it comes out ink with no second
asset.

No age gate. This is public YouTube content and gating it would be a lie about
what it is.

Because the ground is paper, thumbnails need an edge or light frames bleed into
it. A hairline in `color-mix(in srgb, var(--color-ink) 14%, transparent)` on
each tile, which is the same idiom the dividers use.

## Data pipeline

`scripts/fetch-youtube.mjs`, wired as an npm `prebuild` script so `next build`
always runs it first.

Inputs:

- `YOUTUBE_API_KEY` from the environment. Never committed, never referenced from
  client code — this script runs in Node at build time and its output is data,
  so the key never reaches the bundle.
- Channel id `UCo1Zueyx36kh1htZel-ggsg`, a module constant. Resolved from the
  `@YrsaClicks` handle and confirmed against two independent markers in the
  channel's HTML.

Steps:

1. Uploads playlist id is the channel id with `UC` swapped for `UU` —
   `UUo1Zueyx36kh1htZel-ggsg`. This is a documented property of the API and
   saves a `channels.list` call.
2. `playlistItems.list` over that playlist, paginated at 50, 1 quota unit per
   page.
3. `videos.list` for `contentDetails.duration` on the ids gathered, 1 unit per
   50 ids.
4. Classify each item, newest first, and keep the 12 newest of each kind.
5. Download each kept thumbnail (see below).
6. Write `app/lib/youtube-data.json`.

The whole catalogue therefore costs on the order of single-digit quota units
against a default allowance of 10,000 per day. Quota is not a constraint here
and no caching layer is needed to protect it.

`search.list` is not used anywhere. It costs 100 units per call and returns
less than the playlist route does.

### Failing safely

The build must never fail because the key is absent or Google is having a bad
day. So `app/lib/youtube-data.json` is **committed to the repo**, and the
script treats it as the fallback:

- On success, it overwrites the file.
- On any failure — missing key, network error, non-200, malformed payload — it
  logs a clear warning, leaves the existing file untouched, and exits zero.

The worst case is one slightly stale row. A contributor with no API key can
clone, build, and see a working page. This is the single most important
robustness property of the design and should not be traded away for tidiness.

### Classifying Shorts

YouTube exposes no flag for whether an upload is a Short. The discriminator is
duration: 180 seconds or less is treated as a Short.

This is an approximation and will occasionally be wrong — a genuinely short
landscape video gets filed into the Shorts row, where its 16:9 frame will sit
in a 9:16 tile and look wrong. The script therefore reads a small
`OVERRIDES` map of video id to `"short" | "video"` for the exceptions, checked
before the duration rule. Fixing a misfiled video is a one-line edit, not a
rethink.

### Thumbnails

Downloaded at build into `public/media/youtube/<id>.jpg` and referenced through
the existing `asset()` helper, rather than hotlinked from `i.ytimg.com`.

Three reasons. `images.unoptimized` plus static hosting means there is no
runtime image proxy to route them through anyway. Every other asset in the repo
goes through `asset()`, and one path that does not would be the odd one out.
And it removes a third-party runtime dependency from a page that has to work
inside Instagram's in-app browser on a cheap phone, which is where much of this
traffic arrives.

These files are **committed**, exactly like the JSON, and for the same reason:
they are the other half of the fallback. If the script bailed before its
download step and the images were only ever build output, a keyless build would
render the committed JSON against files that do not exist — two dozen broken
tiles, which is worse than a stale row and would quietly undo the guarantee
above. The download step therefore skips any file already present, so the
committed set and the live fetch converge instead of fighting.

Cost is roughly 24 files in the repo. The script requests `maxresdefault` and
falls back to `hqdefault`, which is the one size YouTube guarantees exists for
every video.

## Components

`app/watch/VideoRows.tsx`, a client component, holding three pieces.

**`Row`** — a native `overflow-x-auto` scroller with CSS scroll-snap and the
existing `.no-scrollbar` utility from `globals.css`, reused rather than
re-declared. Native scrolling means thumb-swipe works with no code, and the
chevrons are a convenience over it rather than the only way through: they call
`scrollBy` by one tile width. No carousel dependency enters the project.

The last tile in view is deliberately clipped by the container rather than
fitted to it. A partially visible tile is what tells a visitor the row
continues sideways; the chevrons only confirm it.

**`Tile`** — thumbnail, title beneath, and a duration badge on long-form only.
Ratio is set with `aspect-ratio`: `9/16` in the Shorts row, `16/9` in the
Videos row. The two shapes are what make the rows readable without leaning on
their labels.

Durations are kept because a duration is information a visitor acts on. View
counts are dropped: they are a number about her rather than for them, and they
are the single detail that most makes a page look like it is reporting
analytics.

**`Lightbox`** — the player. Covered next.

Reduced motion is respected through the existing `useReducedMotionSafe` hook:
the chevrons scroll instantly rather than smoothly.

## The player

`https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0` in an iframe.
The `nocookie` host is used because it sets no tracking cookie until playback
actually begins.

**The iframe is mounted only while the lightbox is open, and unmounted on
close.** This is the decision the page's usability rests on. Eagerly embedding
24 players would pull YouTube's player JavaScript in 24 times on first paint,
which on the low-end phone this site is explicitly built for is the difference
between a page and a stall. Thumbnails are nearly free; players are not.

Embedding is YouTube's own supported mechanism for third-party playback and
views counted through it accrue to the channel, so nothing is lost by watching
here rather than there.

The box is `9/16` for a Short and `16/9` for long-form, capped by viewport
height so a vertical player cannot overflow a phone screen.

Behaviour:

- Closes on the `×`, on Escape, and on a backdrop click.
- Returns focus to the tile it was opened from, and traps focus while open.
- Holds the page behind with `document.body.style.overflow`, restoring whatever
  was there before. Not Lenis `stop()`/`start()`: this route never mounts Lenis
  at all, per the note under "Route and ground".

The veil reuses the `gate-veil` idiom already in `globals.css` — ink with a
6px `backdrop-filter` blur, and a higher ink opacity where `backdrop-filter`
is unsupported. A paper page going dark to watch is a deliberate beat, and it
is the same gesture the age gate already makes.

## The homepage change

In the `sections` array in `app/page.tsx`, the `youtube` entry's `cta` becomes
**conditional on `hasClips`**: `{ label: "Watch", href: "/watch" }` when the
snapshot holds something, and the existing off-site link to the channel when it
does not.

An unconditional repoint was what this originally said, and it would have been a
regression. The channel is empty (see below), so today it would have swapped a
button that reaches her actual channel for one that reaches an empty page on
this site — worse than what shipped before the feature. Choosing on `hasClips`
means the site is never worse than it is now, and the first build that finds
uploads flips the button with nothing to remember by hand.

`external` comes off only in the populated branch, so `StackSection` renders a
`next/link` there and a bare anchor in the other — which is what the comment on
that property already describes.

Nothing else in the scroll stack moves. `RIDE_VH`, `HOLD_VH` and `OPEN_VH` are
untouched, so `tests/scroll-pacing.mjs` should stay green — which is the check
that proves this claim rather than an assumption resting on it.

## Testing

A new `tests/watch.mjs` beside the existing Playwright pacing test.

It has two modes, because an empty snapshot would make every row assertion pass
by never running — which is worse than having no test. `node tests/watch.mjs`
asserts whatever the snapshot produces plus everything that needs no browser;
`node tests/watch.mjs --fixture` writes a full twelve-per-row fixture, rebuilds,
runs the row and player assertions against it, and restores the snapshot and
thumbnails in a `finally` so a failed assertion cannot leave fixture data in the
working tree. Fixture mode leaves `out/` holding the fixture build, so
`npm run build` should be rerun after it.

The fixture is twelve per row rather than a token two on purpose: the chevrons
correctly disable themselves when a row has nowhere to scroll, so a short
fixture makes "the chevron advances the row" unprovable.

What it checks:

1. Both rows render, each with at least one tile.
2. No `iframe` exists anywhere in the document before a tile is clicked. This
   is the assertion that protects the load-bearing decision above, so it
   matters more than it looks.
3. Clicking a tile mounts an iframe whose `src` contains that tile's video id.
4. Escape closes the lightbox and the iframe is removed from the document.
5. The chevron advances the row's `scrollLeft`.

Plus two build-level checks:

6. `next build` succeeds with `YOUTUBE_API_KEY` unset, the committed JSON is
   left byte-identical, and every thumbnail the page then references resolves
   to a file that exists. Asserting the build merely succeeds is not enough —
   it would pass on a page of broken tiles.
7. The classifier maps a known 45-second upload to `short` and a known
   nine-minute upload to `video`, and an `OVERRIDES` entry beats the duration
   rule.

## Risks

**Lenis and the horizontal scroller — resolved, not mitigated.** This was the
design's largest risk: a native horizontal scroller inside a Lenis-driven page
can have its wheel and touch events intercepted, and the expected fix was
`data-lenis-prevent`. It turned out not to apply. `/watch` never mounts
`ScrollProvider`, following `/members`, so Lenis is not on the route and the
rows keep their own gestures by default. No fencing, no `data-lenis-prevent`.

**Staleness.** The list is only as current as the last build. Wiring a
scheduled rebuild is Cloudflare work that sits outside this design; until it
exists, a new upload appears on the next deploy.

**Shorts misclassification.** Covered above, mitigated by `OVERRIDES`, and
visible rather than silent — a misfiled video looks wrong in its tile.

## Prerequisites owned by the user

- A YouTube Data API v3 key from a Google Cloud project, set as
  `YOUTUBE_API_KEY` in the build environment. Free at this volume. Generating
  and storing it is theirs to do; it is not handled here.

## Out of scope

The full browsable archive; playlists; a search or filter over the rows;
comments; subscriber counts; anything that keeps state about what a visitor has
watched.

---

## Amendment — the rows moved onto the landing page

Status: superseded in placement, unchanged in everything else.

The design above put the rows on a `/watch` route reached from the landing
page's second plate. That plate has been removed and the rows now sit in its
place, as an ordinary scrolling section at the end of the stack
(`app/components/ChannelSection.tsx`). The route is gone.

**Why.** The plate was a full-bleed photograph whose whole job was to advertise
a page — and the page it advertised was the thing worth seeing. Publicly
watchable work does not need a door in front of it. The archive above stays a
plate because what is behind *it* is paid, so a photograph and an invitation is
all the page can honestly show.

**What the move cost, and how each was paid.**

| Problem | Resolution |
|---|---|
| The rows now live inside Lenis, which claims wheel and touch page-wide — a sideways gesture over a row scrolled the page instead | `data-lenis-prevent` on each scroller. Asserted by a test, since it is invisible until someone tries it on a trackpad. |
| The player held the page still with `body { overflow: hidden }`, which Lenis ignores — it runs its own RAF loop against its own wrapper | `Player` also calls `lenis.stop()`/`start()`, via `useOptionalLenis`, which returns null instead of throwing for any future standalone use. |
| The fixed, centred wordmark landed on a centred "Watch" heading, at rest, at every viewport | The section's heading is ranged left. Padding could not fix this: the page comes to rest with the section's top off-screen. |

**The empty state is gone**, and with it the reasoning in "The channel is
empty" above. The channel still has no uploads — verified again at the time of
this amendment: the Atom feed, the videos tab, the Shorts tab and the streams
tab all report zero. The section instead ships twelve stand-in tiles per row,
cut from photographs in `Content/`, carrying a `placeholder: true` flag.

That flag is what keeps this from being a lie the page tells. A stand-in tile
is an anchor to the channel, not a button that opens a player — there is no
video behind it, and an embed would announce that in YouTube's words. The
titles and durations are invented, and they will be read as real. That is the
known cost of the decision, taken deliberately: the alternative was a section
that reads as an apology.

The first build that finds real uploads replaces the whole snapshot and the
stand-ins disappear on their own. Their files (`standin-*.jpg`) can be deleted
then.
