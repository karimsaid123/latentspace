export interface VisualResolutionContext {
  title?: string;
  lab?: string;
  sourceName?: string;
  entryType?: string;
  arxivId?: string;
}

/**
 * Maps any article context (title, frontier lab, publication source, paper type)
 * to a high-contrast editorial vector visual instead of repetitive generic placeholders.
 */
export function getArticleFallbackVisual(ctx?: VisualResolutionContext | null): string {
  if (!ctx) return '/brand-art/default-ai.svg';

  const t = (ctx.title || '').toLowerCase();
  const l = (ctx.lab || '').toLowerCase();
  const s = (ctx.sourceName || '').toLowerCase();

  // 1. NVIDIA / GPU Hardware & Silicon
  if (
    l.includes('nvidia') ||
    t.includes('nvidia') ||
    t.includes('blackwell') ||
    t.includes('geforce') ||
    t.includes('cuda') ||
    t.includes('h100') ||
    t.includes('b200') ||
    t.includes('gpu cluster')
  ) {
    return '/brand-art/nvidia.svg';
  }

  // 2. OpenAI / GPT / Reasoning
  if (
    l.includes('openai') ||
    t.includes('openai') ||
    t.includes('chatgpt') ||
    t.includes('gpt-4') ||
    t.includes('gpt-5') ||
    t.includes('o3-mini') ||
    t.includes('sam altman') ||
    t.includes('sora')
  ) {
    return '/brand-art/openai.svg';
  }

  // 3. Google DeepMind / Gemini / AlphaFold
  if (
    l.includes('deepmind') ||
    l.includes('google') ||
    t.includes('deepmind') ||
    t.includes('gemini') ||
    t.includes('alphafold') ||
    t.includes('demis hassabis') ||
    t.includes('google ai')
  ) {
    return '/brand-art/deepmind.svg';
  }

  // 4. Anthropic / Claude
  if (
    l.includes('anthropic') ||
    t.includes('anthropic') ||
    t.includes('claude') ||
    t.includes('dario amodei') ||
    t.includes('constitutional ai')
  ) {
    return '/brand-art/anthropic.svg';
  }

  // 5. SpaceX / xAI / Grok / Colossus / Elon Musk
  if (
    l.includes('xai') ||
    l.includes('spacex') ||
    t.includes('xai') ||
    t.includes('grok') ||
    t.includes('spacex') ||
    t.includes('starlink') ||
    t.includes('colossus') ||
    t.includes('elon musk')
  ) {
    return '/brand-art/xai.svg';
  }

  // 6. Meta AI / LLaMA / FAIR
  if (
    l.includes('meta') ||
    t.includes('meta ai') ||
    t.includes('llama') ||
    t.includes('zuckerberg') ||
    t.includes('fair lab')
  ) {
    return '/brand-art/meta.svg';
  }

  // 7. Apple Intelligence
  if (
    l.includes('apple') ||
    t.includes('apple intelligence') ||
    t.includes('iphone') ||
    t.includes('tim cook') ||
    t.includes('ios 18') ||
    t.includes('ios 27')
  ) {
    return '/brand-art/apple.svg';
  }

  // 8. Microsoft AI / Copilot / Azure
  if (
    l.includes('microsoft') ||
    t.includes('microsoft') ||
    t.includes('copilot') ||
    t.includes('satya nadella') ||
    t.includes('azure ai')
  ) {
    return '/brand-art/microsoft.svg';
  }

  // 9. Mistral AI / European Frontier
  if (
    l.includes('mistral') ||
    t.includes('mistral') ||
    t.includes('mixtral') ||
    t.includes('codestral') ||
    t.includes('le chat')
  ) {
    return '/brand-art/mistral.svg';
  }

  // 10. Hugging Face / Open Source Models
  if (
    s.includes('hugging face') ||
    t.includes('hugging face') ||
    t.includes('open-weights') ||
    t.includes('open source model')
  ) {
    return '/brand-art/huggingface.svg';
  }

  // 11. Cornell arXiv / Scientific Research Papers
  if (
    ctx.entryType === 'RESEARCH_PAPER' ||
    Boolean(ctx.arxivId) ||
    s.includes('arxiv') ||
    t.includes('arxiv') ||
    t.includes('paper') ||
    t.includes('preprint') ||
    t.includes('theorem') ||
    t.includes('reinforcement learning') ||
    t.includes('neural architecture')
  ) {
    return '/brand-art/arxiv.svg';
  }

  // 12. TechCrunch Dispatch
  if (s.includes('techcrunch')) {
    return '/brand-art/techcrunch.svg';
  }

  // 13. The Verge AI
  if (s.includes('verge')) {
    return '/brand-art/theverge.svg';
  }

  // 14. Default Monumental Swiss AI Radar Visual
  return '/brand-art/default-ai.svg';
}
