/**
 * The deployed origin.
 *
 * Everything else in the app is host-relative, deliberately. og:image is the
 * exception that forces this to exist: scrapers ignore a relative image path,
 * so the absolute URL has to be baked at build time.
 *
 * Moving domain means changing this *and* the `CNAME` file at the repo root.
 */
export const ORIGIN = 'https://slimatlas.com';
