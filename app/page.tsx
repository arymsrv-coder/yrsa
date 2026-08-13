"use client";

import { useMemo, useState } from "react";
import { motionValue } from "framer-motion";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Loader from "./components/Loader";
import StackSection from "./components/StackSection";
import { ScrollProvider } from "./context/ScrollContext";
import { asset } from "./lib/asset";

// One plate, arriving on the paper half of the two-tone system over the hero's
// footage. The page is now the shortest it can be and still have somewhere to
// go: the footage, then the way in.
const sections = [
  {
    // Explicit, not derived from the title — the title is two words now, and
    // lower-casing it would put a space in the anchor id.
    id: "members",
    index: "01",
    title: "Private archive",
    subtitle: "The private archive",
    poster: asset("/media/members.jpg"),
    panel: "paper" as const,
    cta: {
      label: "Continue",
      href: "/members",
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
