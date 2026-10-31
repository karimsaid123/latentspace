/**
 * Comprehensive HTML Entity Decoder
 * Converts named, decimal (&#8217;), and hex (&#x27;) entities into clean UTF-8 text.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || !text.includes('&')) return text || '';
  
  return text
    // Common named entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Decimal entities like &#8217; (’), &#8220; (“), &#8221; (”), &#10024; (✨)
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    })
    // Hex entities like &#x27; ('), &#x2019; (’)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    });
}
