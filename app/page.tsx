"use client";

import { useMemo, useState } from "react";
import { motionValue } from "framer-motion";
import ChannelSection from "./components/ChannelSection";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Loader from "./components/Loader";
import StackSection from "./components/StackSection";
import { ScrollProvider } from "./context/ScrollContext";
import { asset } from "./lib/asset";

// One pinned plate over the hero's footage, and then the channel.
//
// The archive is a plate because a plate is what it needs: the thing behind it
// is paid, so what the page can show of it is a photograph and an invitation.
// The channel is the opposite — the work is public, and the honest way to
// present work you can actually watch is to put it on the page. So it is not a
// plate at all. See `ChannelSection`, which scrolls up over this stack and ends
// the page.
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
];

function HomeContent() {
  const [ready, setReady] = useState(false);

  // Whether the channel has taken the top of the screen. The wordmark is fixed
  // and centred over everything, which is right over full-bleed footage and
  // wrong over a section that sets its own type up there — so the channel says
  // when it has arrived and the header gets out of the way. Held here rather
  // than in either component because it is the one fact both of them need and
  // neither owns.
  const [channelHasScreen, setChannelHasScreen] = useState(false);

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
      <Header ready={ready} retracted={channelHasScreen} />
      <main className="relative">
        {/* The page had no `h1` at all — its outline started at the first
            plate's title, and the one thing that names the site is a wordmark
            painted through a CSS mask, which carries no text. Visually hidden
            because the design says this with the mark rather than with type;
            hidden from sight is not hidden from a screen reader, a search
            result, or a link preview. */}
        <h1 className="sr-only">
          yrsaclicks — adventure photographer and model
        </h1>

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

        {/* Outside the pinned stack, not in it — see `ChannelSection`. */}
        <ChannelSection onTakesScreen={setChannelHasScreen} />

        {/* Already written, and until now never rendered anywhere. It is the
            one place the site says how to reach her, which the channel's
            closing button is not — that goes to YouTube. */}
        <Footer />
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
