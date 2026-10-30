/**
 * Reliable runtime environment detection across Node.js, Next.js Edge,
 * Cloudflare Workers (@opennextjs/cloudflare), Cloudflare Pages, and Vercel.
 */
export function isServerlessOrEdge(): boolean {
  if (typeof globalThis !== 'undefined') {
    if ('Cloudflare' in globalThis) return true;
    if (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') {
      return true;
    }
  }
  if (typeof process === 'undefined') return true;
  const env = process.env || {};
  return Boolean(
    env.CF_PAGES ||
    env.WORKERS ||
    env.CLOUDFLARE ||
    env.VERCEL ||
    env.NEXT_RUNTIME === 'edge'
  );
}

/**
 * True only in local persistent Node.js development (`next dev`),
 * where background timers (`setInterval`) and local disk persistence are safe.
 */
export function isLocalPersistentDev(): boolean {
  if (isServerlessOrEdge()) return false;
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
}
