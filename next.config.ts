import type { NextConfig } from "next";

// GitHub Pages serves a project repo from `/<repo>/`, not the web root, so the
// Pages build sets this. Left unset everywhere else — the real domain and the
// Hostinger upload both serve the export from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // A folder of HTML/CSS/JS, no Node server. Matches how this ships: static
  // hosting, no image optimizer, no route handlers.
  output: "export",

  basePath,

  // `/members` -> `/members/index.html`, so a plain static host resolves the
  // route without needing a rewrite rule.
  trailingSlash: true,

  images: {
    // The optimizer needs a server. Without this, `output: 'export'` fails the
    // build outright.
    unoptimized: true,
  },
};

export default nextConfig;
