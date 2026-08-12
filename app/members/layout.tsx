import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Archive — yrsaclicks",
  description:
    "The yrsaclicks private archive — unreleased sets, uncut film and the frames that never make the public page.",
  robots: { index: false, follow: false },
};

export default function MembersLayout({ children }: LayoutProps<"/members">) {
  return children;
}
