/**
 * Adds Cache-Control headers to public read-only API responses.
 * Browsers and CDNs will serve cached responses without hitting the server.
 */
export function publicCache(maxAgeSeconds = 60) {
  return (_req, res, next) => {
    res.set("Cache-Control", `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds * 2}, stale-while-revalidate=${maxAgeSeconds * 4}`);
    next();
  };
}
