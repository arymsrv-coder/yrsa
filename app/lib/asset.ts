/**
 * Where the site is mounted on its host.
 *
 * Empty on the real domain (and on Hostinger, where the export sits at the web
 * root). GitHub Pages serves a project repo from `/<repo>/` instead, so the test
 * deploy builds with `NEXT_PUBLIC_BASE_PATH=/yrsaclicks` and every URL the site
 * writes has to carry that prefix.
 *
 * Inlined into the client bundle at build time, same as `basePath` itself.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix a `public/` path with the base path.
 *
 * `next/link` applies `basePath` on its own, but nothing else does — not raw
 * `<video src>`, not `<link href>`, not CSS `url()`, and not `next/image`
 * (whose `src` Next expects to already include the prefix). So every asset
 * reference in the site goes through here rather than being written literally.
 */
export const asset = (path: string) => `${BASE_PATH}${path}`;
