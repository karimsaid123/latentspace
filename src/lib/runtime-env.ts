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

/**
 * Reads a server-only secret across Node.js (`process.env`) and Cloudflare Workers
 * (`@opennextjs/cloudflare` context symbol) where runtime secrets may only exist on `env`.
 */
export function getServerSecret(name: string): string | undefined {
  if (typeof process !== 'undefined' && typeof process.env?.[name] === 'string') {
    const val = process.env[name]?.trim();
    if (val) return val;
  }

  try {
    const cfContextSymbol = Symbol.for('__cloudflare-context__');
    const cfContext = (globalThis as Record<symbol, { env?: Record<string, unknown> } | undefined>)[
      cfContextSymbol
    ];
    const binding = cfContext?.env?.[name];
    if (typeof binding === 'string' && binding.trim()) {
      return binding.trim();
    }
  } catch {
    // Ignore if symbol access is unavailable
  }

  return undefined;
}
