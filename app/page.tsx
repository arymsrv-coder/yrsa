"use client";

import { useMemo, useState } from "react";
import { motionValue } from "framer-motion";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Loader from "./components/Loader";
import StackSection from "./components/StackSection";
import { ScrollProvider } from "./context/ScrollContext";
import { asset } from "./lib/asset";
import { hasClips } from "./lib/youtube";

// Two plates over the hero's footage: the footage, the way in, then the free
// half of the work.
//
// They alternate across the two-tone system, and the order is the argument. The
// archive arrives on ink — the same green as the loading screen it followed, so
// the first solid sheet a visitor meets is the brand's own ground rather than an
// off-white sheet that appears nowhere else. The channel then arrives on paper,
// which is the other half of the same system and the only way a second arrival
// reads as a second thing rather than a repeat of the first. The header's
// `mix-blend-difference` mark inverts over either one without needing anything
// said here.
//
// Order is scroll order: the paid archive is what the site is for, so it comes
// first, and the channel sits under it as the thing to do if the answer to the
// first plate was no.
const sections = [
  {
    // Explicit, not derived from the title — the title is two words now, and
    // lower-casing it would put a space in the anchor id.
    id: "members",
    index: "01",
    title: "Private archive",
    subtitle: "The private archive",
    poster: asset("/media/members.jpg"),
    panel: "ink" as const,
    cta: {
      label: "Continue",
      href: "/members",
    },
  },
  {
    id: "youtube",
    index: "02",
    title: "The channel",
    subtitle: "Watch on YouTube",
    poster: asset("/media/youtube.jpg"),
    // A landscape frame cropped to portrait, so she stands lower in it than the
    // studio still does and there is sky over her head. Holding the top of that
    // would give a desktop screen half a plate of empty blue with the title on
    // her face; centring keeps the whole figure and the horizon.
    focus: "center" as const,
    // The other half of the two-tone system — see the note above.
    panel: "paper" as const,
    // A stated button rather than a clickable plate, so this plate is read the
    // same way as the one above it: the whole picture is not a link, one thing
    // on it is. `external` is what sends it off-site in a new tab.
    //
    // Where it goes depends on whether there is anything to watch. `/watch`
    // holds the channel's recent work and plays it here, which is the better
    // destination — but only once it has something on it. An empty `/watch` is
    // a worse place to land than the channel itself, so while the build
    // snapshot is empty the button keeps doing what it has always done. The
    // first build that finds uploads flips it, with nothing to remember to
    // change by hand.
    cta: hasClips
      ? { label: "Watch", href: "/watch" }
      : {
          label: "Watch",
          href: "https://www.youtube.com/@YrsaClicks",
          external: true,
        },
  },
];

function HomeContent() {
  const [ready, setReady] = useState(false);

  // Where the loading reel's footage had got to as the panel came away, so the
  // hero continues it rather than restarting it. Null until the hand-off, which is
  // also the hero's cue to start playing at all.
  const [handoffAt, setHandoffAt] = useState<number | null>(null);

  const progressValues = useMemo(() => sections.map(() => motionValue(0)), []);

  // Every section hides its own text once the *next* one starts arriving. The
  // last section has no next one — it is where scrolling comes to rest — so it
  // measures against a value that never moves. Handing it a real element below
  // instead made its title and its button fade out over the final few percent
  // of the scroll, which is precisely where the visitor stops and needs the
  // button.
  const endStop = useMemo(() => motionValue(0), []);

  return (
    <>
      <Loader onDone={() => setReady(true)} onHandoff={setHandoffAt} />
      <Header ready={ready} />
      <main className="relative">
        {/* One stacking context: every child pins at top:0 and the next
            one is painted over it, so earlier pages stay put underneath. */}
        <div className="relative">
          <Hero ready={ready} startAt={handoffAt} />
          {sections.map((s, i) => (
            <StackSection
              key={s.index}
              {...s}
              progressMV={progressValues[i]}
              nextProgressMV={
                i === sections.length - 1 ? endStop : progressValues[i + 1]
              }
            />
          ))}
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <ScrollProvider>
      <HomeContent />
    </ScrollProvider>
  );
}
