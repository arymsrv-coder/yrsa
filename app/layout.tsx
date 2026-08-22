import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { asset } from "./lib/asset";

// One family across the whole site — the mark carries the character, the type
// stays neutral behind it.
const montserrat = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "yrsaclicks — Both sides of the lens",
  description:
    "yrsaclicks — adventure photographer and model. Both sides of the lens.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <head>
        {/* The mark is painted through a CSS mask on the very first frame of
            the loading screen, so it has to be in hand before that frame. */}
        <link
          rel="preload"
          as="image"
          href={asset("/media/logo-yrsa3.png")}
          // The mark is fetched by a CSS `mask-image`, and a CSS image load is
          // anonymous. A preload without this defaults to sending credentials,
          // which is a different request as far as the cache is concerned — the
          // browser refused to match them ("the request credentials mode does not
          // match"), downloaded the file twice, and the mask still waited on its
          // own copy. So the preload was not just wasted, it was doubling the
          // work it existed to avoid.
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full bg-[var(--color-ink)] text-[var(--color-paper)]">
        {children}
      </body>
    </html>
  );
}
