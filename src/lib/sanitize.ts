const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  copy: '©',
  reg: '®',
  trade: '™',
  bull: '•',
  middot: '·',
  rarr: '→',
  larr: '←',
  times: '×',
  divide: '÷',
  plusmn: '±',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
};

const ENTITY_PATTERN = /&(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,15}));/g;

function safeFromCodePoint(code: number): string | null {
  if (
    !Number.isInteger(code) ||
    code <= 0 ||
    code > 0x10ffff ||
    (code >= 0xd800 && code <= 0xdfff)
  ) {
    return null;
  }
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

/**
 * Single-pass O(N) HTML Entity Decoder.
 * Prevents double-unescaping vulnerabilities (e.g. `&amp;lt;` -> `&lt;`, never `<`)
 * and validates Unicode code points against surrogate/out-of-range injection.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || !text.includes('&')) return text || '';

  return text.replace(ENTITY_PATTERN, (fullMatch, dec, hex, named) => {
    if (dec !== undefined) {
      const decoded = safeFromCodePoint(parseInt(dec, 10));
      return decoded ?? fullMatch;
    }
    if (hex !== undefined) {
      const decoded = safeFromCodePoint(parseInt(hex, 16));
      return decoded ?? fullMatch;
    }
    if (named !== undefined) {
      const exact = NAMED_ENTITIES[named];
      if (exact !== undefined) return exact;
      const lower = NAMED_ENTITIES[named.toLowerCase()];
      if (lower !== undefined) return lower;
    }
    return fullMatch;
  });
}
