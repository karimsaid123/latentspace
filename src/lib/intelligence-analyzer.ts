import { AISummary, FrontierLab, ImpactLevel } from '@/core/domain/entities';
import { decodeHtmlEntities } from './sanitize';

/**
 * Accurately detects whether an article belongs to a major Frontier AI Lab / Ecosystem
 */
export function detectFrontierLab(title: string, content: string, sourceName = ''): FrontierLab {
  const s = sourceName.toLowerCase();
  const t = title.toLowerCase();
  const c = content.toLowerCase();
  const combined = `${t} ${c} ${s}`;

  // 1. Direct Source Name lab matching
  if (/\bxai\b|\bspacex\b|\bgrok\b/.test(s)) return 'SpaceX & xAI';
  if (s.includes('deepseek')) return 'DeepSeek';
  if (s.includes('mistral')) return 'Mistral AI';
  if (s.includes('moonshot') || /\bkimi\b/.test(s)) return 'Moonshot AI';
  if (s.includes('openai')) return 'OpenAI';
  if (s.includes('deepmind')) return 'Google DeepMind';
  if (s.includes('anthropic') || /\bclaude\b/.test(s)) return 'Anthropic';
  if (s.includes('nvidia')) return 'NVIDIA';
  if (s.includes('meta ai') || /\bfair\b/.test(s)) return 'Meta AI';

  // Cloud infrastructure blogs (AWS, Google Cloud) default to Independent unless title is specifically about a frontier lab
  if (
    (/\baws\b/.test(s) || s.includes('amazon')) &&
    !/\b(meta|llama|nvidia|openai|anthropic|deepseek|mistral)\b/.test(t)
  ) {
    return 'Independent';
  }

  // 2. High Priority: Title mentions lab or flagship model (strict word boundaries prevent "octopus" -> "opus" or "operator" false positives)
  if (/\b(deepseek|liang wenfeng|dsh-superagent|fire-flyer)\b/.test(t)) {
    return 'DeepSeek';
  }

  if (/\b(mistral|mixtral|codestral|le chat|arthur mensch)\b/.test(t)) {
    return 'Mistral AI';
  }

  if (/\b(moonshot|kimi|yang zhilin)\b/.test(t)) {
    return 'Moonshot AI';
  }

  if (/\b(xai|spacex|grok|colossus|starlink|elon musk|musk)\b/.test(t)) {
    return 'SpaceX & xAI';
  }

  if (
    /\b(anthropic|claude|dario amodei)\b/.test(t) ||
    /\b(opus|sonnet|haiku)\s+\d/.test(t)
  ) {
    return 'Anthropic';
  }

  if (
    /\b(deepmind|demis hassabis|gemini|gemma|alphafold|project suncatcher)\b/.test(t) ||
    (/\bgoogle\b/.test(t) && /\b(tpu|ai server|frontier|ai model)\b/.test(t))
  ) {
    return 'Google DeepMind';
  }

  if (
    /\b(openai|chatgpt|sam altman|sora|openai operator)\b/.test(t) ||
    /\b(gpt|o1|o3|o4)-[a-z0-9]/.test(t)
  ) {
    return 'OpenAI';
  }

  if (/\b(nvidia|jensen huang|blackwell|h100|h200|b200|gb200|cuda|superchip)\b/.test(t)) {
    return 'NVIDIA';
  }

  if (/\b(meta ai|llama|yann lecun|mark zuckerberg|fair lab)\b/.test(t)) {
    return 'Meta AI';
  }

  // 3. Fallback: Combined Text Matching with strict word boundaries
  if (/\b(deepseek|deepseek-r1|deepseek-v3|liang wenfeng)\b/.test(combined)) {
    return 'DeepSeek';
  }

  if (/\b(mistral ai|mixtral|codestral|arthur mensch)\b/.test(combined)) {
    return 'Mistral AI';
  }

  if (/\b(moonshot ai|kimi k\d|kimi chat)\b/.test(combined)) {
    return 'Moonshot AI';
  }

  if (
    /\b(xai|spacex|grok|colossus|starlink)\b/.test(combined) ||
    (/\bmusk\b/.test(combined) && /\b(cluster|memphis|satellite|turbine|gpu)\b/.test(combined))
  ) {
    return 'SpaceX & xAI';
  }

  if (
    /\b(anthropic|claude|dario amodei|constitutional ai)\b/.test(combined) ||
    /\b(opus|sonnet|haiku)\s+\d/.test(combined)
  ) {
    return 'Anthropic';
  }

  if (
    /\b(deepmind|demis hassabis|gemini|gemma|alphafold|project suncatcher)\b/.test(combined) ||
    (/\bgoogle\b/.test(combined) && /\b(tpu|ai server|frontier model)\b/.test(combined))
  ) {
    return 'Google DeepMind';
  }

  if (
    /\b(openai|chatgpt|sam altman|sora|openai operator)\b/.test(combined) ||
    /\b(gpt-4|gpt-5|gpt-6)\b/.test(combined)
  ) {
    return 'OpenAI';
  }

  if (/\b(meta ai|llama\s*\d|yann lecun|mark zuckerberg|fair lab)\b/.test(combined)) {
    return 'Meta AI';
  }

  if (/\b(nvidia|jensen huang|blackwell|h100|h200|b200|gb200|cuda|superchip)\b/.test(combined)) {
    return 'NVIDIA';
  }

  return 'Independent';
}

export function detectEntryType(
  title: string,
  content: string,
  url = '',
  sourceName = ''
): { entryType: 'DISPATCH' | 'RESEARCH_PAPER'; arxivId?: string; pdfUrl?: string } {
  const combined = `${title} ${content} ${url} ${sourceName}`.toLowerCase();

  // 1. Check for arXiv
  const arxivMatch = url.match(/arxiv\.org\/(abs|pdf)\/([0-9]+\.[0-9]+)/i) || combined.match(/arxiv:([0-9]+\.[0-9]+)/i);
  if (arxivMatch) {
    const id = arxivMatch[2] || arxivMatch[1];
    return {
      entryType: 'RESEARCH_PAPER',
      arxivId: `arXiv:${id}`,
      pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
    };
  }

  // 2. Check for explicit papers or preprint terminology
  if (
    combined.includes('arxiv') ||
    combined.includes('research paper') ||
    combined.includes('published paper') ||
    combined.includes('technical report') ||
    combined.includes('abstract:') ||
    combined.includes('proposes a novel') ||
    combined.includes('we introduce') ||
    combined.includes('empirical evaluation') ||
    title.toLowerCase().startsWith('evaluating ') ||
    title.toLowerCase().startsWith('benchmarking ') ||
    title.toLowerCase().includes(': towards ') ||
    sourceName.toLowerCase().includes('arxiv') ||
    sourceName.toLowerCase().includes('research')
  ) {
    return {
      entryType: 'RESEARCH_PAPER',
    };
  }

  return {
    entryType: 'DISPATCH',
  };
}

/**
 * Determines impact severity
 */
export function evaluateImpact(title: string, text: string): ImpactLevel {
  const lower = `${title} ${text}`.toLowerCase();
  if (
    lower.includes('breakthrough') ||
    lower.includes('superintelligence') ||
    lower.includes('frontier model') ||
    lower.includes('satellite ai') ||
    lower.includes('orbital') ||
    lower.includes('billion') ||
    lower.includes('quantum')
  ) {
    return 'Breakthrough';
  }
  if (
    lower.includes('unveils') ||
    lower.includes('launches') ||
    lower.includes('raises') ||
    lower.includes('major') ||
    lower.includes('benchmark') ||
    lower.includes('cluster')
  ) {
    return 'High';
  }
  if (lower.includes('releases') || lower.includes('updates') || lower.includes('partners')) {
    return 'Medium';
  }
  return 'Notable';
}

export type ArticleDomain = 
  | 'MARKETS_FINANCE' 
  | 'HARDWARE_INFRASTRUCTURE' 
  | 'FRONTIER_RESEARCH' 
  | 'CONSUMER_PRODUCT' 
  | 'POLICY_REGULATION' 
  | 'GENERAL_AI';

/**
 * Classifies an article into a functional domain to generate contextually accurate intelligence.
 */
export function detectArticleDomain(title: string, content: string): ArticleDomain {
  const combined = `${title} ${content}`.toLowerCase();

  // 1. Markets & Finance: investments, funding, stocks, earnings, debt, loans, deals, revenue, IPO
  if (
    combined.includes('stock') ||
    combined.includes('shares') ||
    combined.includes('valuation') ||
    combined.includes('funding') ||
    combined.includes('raises') ||
    combined.includes('raised') ||
    combined.includes('billion') ||
    combined.includes('million') ||
    combined.includes('cosigner') ||
    combined.includes('loan') ||
    combined.includes('credit rating') ||
    combined.includes('junk rating') ||
    combined.includes('ipo') ||
    combined.includes('revenue') ||
    combined.includes('earnings') ||
    combined.includes('venture') ||
    combined.includes('investor') ||
    combined.includes('antitrust') ||
    combined.includes('acquisition') ||
    combined.includes('market cap') ||
    combined.includes('government stake') ||
    combined.includes('crashes')
  ) {
    return 'MARKETS_FINANCE';
  }

  // 2. Hardware & Infrastructure: datacenter, chips, GPUs, power, cooling, clusters
  if (
    combined.includes('data center') ||
    combined.includes('datacenter') ||
    combined.includes('gpu') ||
    combined.includes('gpus') ||
    combined.includes('blackwell') ||
    combined.includes('h100') ||
    combined.includes('b200') ||
    combined.includes('tpu') ||
    combined.includes('semiconductor') ||
    combined.includes('silicon') ||
    combined.includes('foundry') ||
    combined.includes('tsmc') ||
    combined.includes('gigawatt') ||
    combined.includes('megawatt') ||
    combined.includes('supercomputer') ||
    combined.includes('colossus') ||
    combined.includes('interconnect') ||
    combined.includes('memory bandwidth') ||
    combined.includes('cluster')
  ) {
    return 'HARDWARE_INFRASTRUCTURE';
  }

  // 3. Research & Papers: arXiv, algorithms, mathematics, theorems, architectures
  if (
    combined.includes('arxiv') ||
    combined.includes('abstract:') ||
    combined.includes('paper') ||
    combined.includes('benchmark') ||
    combined.includes('dataset') ||
    combined.includes('empirical') ||
    combined.includes('theorem') ||
    combined.includes('reinforcement learning') ||
    combined.includes('diffusion') ||
    combined.includes('distillation') ||
    combined.includes('reasoning') ||
    combined.includes('attention mechanism') ||
    combined.includes('loss curve')
  ) {
    return 'FRONTIER_RESEARCH';
  }

  // 4. Policy, Legal & Sovereign AI
  if (
    combined.includes('regulation') ||
    combined.includes('policy') ||
    combined.includes('lawsuit') ||
    combined.includes('court') ||
    combined.includes('copyright') ||
    combined.includes('eu ai act') ||
    combined.includes('executive order') ||
    combined.includes('national security') ||
    combined.includes('export control') ||
    combined.includes('banned') ||
    combined.includes('white house') ||
    combined.includes('ftc')
  ) {
    return 'POLICY_REGULATION';
  }

  // 5. Consumer, OS & Products
  if (
    combined.includes('ios') ||
    combined.includes('iphone') ||
    combined.includes('android') ||
    combined.includes('macos') ||
    combined.includes('windows') ||
    combined.includes('app') ||
    combined.includes('feature') ||
    combined.includes('desktop') ||
    combined.includes('mobile') ||
    combined.includes('voice mode') ||
    combined.includes('rollout') ||
    combined.includes('consumer') ||
    combined.includes('siri')
  ) {
    return 'CONSUMER_PRODUCT';
  }

  return 'GENERAL_AI';
}

function cleanSentence(s: string): string {
  let trimmed = s.trim();
  if (!trimmed) return '';
  trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!/[.?!]$/.test(trimmed)) {
    trimmed += '.';
  }
  return trimmed;
}

/**
 * Extracts a clean, strictly factual summary and key points directly from the RSS text
 * WITHOUT inventing any canned filler, buzzwords, or speculative commentary.
 * Used as the instant baseline until full-article Gemini synthesis completes.
 */
export function generateDeepIntelligenceSummary(
  rawTitle: string,
  rawContent: string,
  sourceName = 'Frontier Radar'
): AISummary {
  void sourceName;
  const title = decodeHtmlEntities((rawTitle || '').slice(0, 500)).trim();
  const content = decodeHtmlEntities((rawContent || '').slice(0, 8000)).trim();
  const impact = evaluateImpact(title, content);

  const cleanedContent = content
    .replace(/The post [^\n]{1,240}? appeared first on [^\n]{1,200}/gi, '')
    .replace(/© \d{4} [^\n]{1,160}? All rights reserved\.?/gi, '')
    .replace(/Continue reading[^\n]{0,120}/gi, '')
    .replace(/Read more\.{0,3}/gi, '')
    .replace(/\[&#8230;\]/g, '...')
    .replace(/\[…\]/g, '...')
    .replace(/<[^>]{0,1024}>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const extractedSentences = cleanedContent
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 25) return false;
      const lower = s.toLowerCase();
      if (
        lower.startsWith('read more') ||
        lower.startsWith('click here') ||
        lower.startsWith('subscribe') ||
        lower.includes('all rights reserved') ||
        lower.includes('appeared first on')
      ) {
        return false;
      }
      const normSent = lower.replace(/[^a-z0-9]+/g, ' ').trim();
      if (normSent === normalizedTitle) return false;
      return true;
    })
    .map(cleanSentence);

  let tldr = '';
  const takeaways: string[] = [];

  if (extractedSentences.length === 0) {
    tldr = cleanSentence(title);
  } else if (extractedSentences.length <= 2) {
    tldr = extractedSentences.join(' ');
  } else if (extractedSentences.length <= 5) {
    tldr = extractedSentences.slice(0, 3).join(' ');
    for (const s of extractedSentences.slice(3, 6)) {
      takeaways.push(s);
    }
  } else {
    const para1 = extractedSentences.slice(0, 3).join(' ');
    const para2 = extractedSentences.slice(3, 6).join(' ');
    tldr = `${para1}\n\n${para2}`;
    for (const s of extractedSentences.slice(6, 10)) {
      takeaways.push(s);
    }
  }

  const wordCount = (title + ' ' + cleanedContent).split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  return {
    tldr,
    takeaways,
    impact,
    readTimeMinutes,
    generatedWith: 'heuristic',
  };
}
