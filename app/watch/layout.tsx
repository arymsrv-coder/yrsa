import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The channel — yrsaclicks",
  description:
    "Shorts and films from the yrsaclicks channel, watchable here without leaving.",
};

export default function WatchLayout({ children }: LayoutProps<"/watch">) {
  return children;
}
