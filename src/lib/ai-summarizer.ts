import { Category, AISummary, ImpactLevel } from '@/types';

// Keyword rules for categorization
const CATEGORY_RULES: { category: Category; keywords: string[] }[] = [
  {
    category: 'LLMs & GenAI',
    keywords: [
      'llm', 'language model', 'gpt', 'chatgpt', 'claude', 'gemini', 'prompt',
      'generative', 'transformer', 'diffusion', 'reasoning', 'text-to-image',
      'text-to-video', 'sora', 'copilot', 'multimodal', 'agent', 'conversational',
      'deepseek', 'anthropic', 'openai'
    ]
  },
  {
    category: 'Robotics & Hardware',
    keywords: [
      'robot', 'humanoid', 'hardware', 'nvidia', 'gpu', 'blackwell', 'tpu',
      'chip', 'semiconductor', 'boston dynamics', 'figure', 'optimus',
      'autonomous', 'drone', 'actuator', 'quantum', 'arm', 'spatial computing'
    ]
  },
  {
    category: 'Open Source & Research',
    keywords: [
      'open source', 'open-source', 'weights', 'hugging face', 'github',
      'paper', 'arxiv', 'dataset', 'benchmark', 'fine-tuning', 'fine-tune',
      'meta llama', 'llama', 'mistral', 'qwen', 'deepseek-r1', 'ollama',
      'researchers', 'scientists', 'algorithm'
    ]
  },
  {
    category: 'Business & Big Tech',
    keywords: [
      'startup', 'funding', 'round', 'valuation', 'acquisition', 'acquired',
      'microsoft', 'apple', 'meta', 'amazon', 'ipo', 'market', 'venture',
      'investor', 'billion', 'million', 'enterprise', 'vc', 'salesforce',
      'partnership', 'commercial'
    ]
  },
  {
    category: 'Ethics & Policy',
    keywords: [
      'regulation', 'policy', 'copyright', 'eu ai act', 'white house',
      'safety', 'alignment', 'deepfake', 'governance', 'lawsuit', 'ban',
      'senate', 'watermark', 'ethics', 'bias', 'privacy', 'national security'
    ]
  }
];

export function categorizeText(title: string, content: string, fallback: Category = 'LLMs & GenAI'): Category {
  const fullText = `${title} ${content}`.toLowerCase();
  
  let bestCategory = fallback;
  let highestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      // Title matches carry 3x weight
      if (title.toLowerCase().includes(kw)) {
        score += 3;
      }
      if (fullText.includes(kw)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestCategory;
}

export function determineImpact(title: string, content: string): ImpactLevel {
  const text = `${title} ${content}`.toLowerCase();

  if (
    text.includes('breakthrough') ||
    text.includes('frontier model') ||
    text.includes('gpt-5') ||
    text.includes('gemini 4') ||
    text.includes('superintelligence') ||
    text.includes('next-generation') ||
    text.includes('unveils new flagship')
  ) {
    return 'Breakthrough';
  }

  if (
    text.includes('billion') ||
    text.includes('raises') ||
    text.includes('acquires') ||
    text.includes('major update') ||
    text.includes('open-sources') ||
    text.includes('eu ai act') ||
    text.includes('launches')
  ) {
    return 'High';
  }

  if (
    text.includes('introduces') ||
    text.includes('releases') ||
    text.includes('researchers') ||
    text.includes('announces')
  ) {
    return 'Medium';
  }

  return 'Notable';
}

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function heuristicSummarize(title: string, rawContent: string): AISummary {
  const cleanContent = cleanHtml(rawContent);
  const words = cleanContent.split(/\s+/).filter(Boolean);
  const readTimeMinutes = Math.max(1, Math.ceil(words.length / 180));
  const impact = determineImpact(title, cleanContent);

  // Split into sentences
  const sentences = cleanContent
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.toLowerCase().includes('skip the') && !s.toLowerCase().includes('click here'));

  let tldr = '';
  if (sentences.length > 0) {
    // Pick the most descriptive opening or high-signal sentence
    tldr = sentences[0];
    if (tldr.length < 40 && sentences[1]) {
      tldr = `${tldr} ${sentences[1]}`;
    }
  } else {
    tldr = `${title}: Key development in artificial intelligence.`;
  }

  // Generate 2-3 structured takeaways
  const takeaways: string[] = [];
  
  if (sentences.length > 1) {
    takeaways.push(sentences[1].replace(/^[A-Z][a-z]+ announced that /, ''));
  }
  if (sentences.length > 2 && takeaways.length < 2) {
    takeaways.push(sentences[2]);
  }
  if (sentences.length > 3 && takeaways.length < 3) {
    takeaways.push(sentences[3]);
  }

  // Ensure we always have at least 2 punchy points
  if (takeaways.length === 0) {
    takeaways.push(`Announcement focusing on advances in ${title.slice(0, 50)}...`);
    takeaways.push('Relevant for engineers, researchers, and AI industry practitioners.');
  } else if (takeaways.length === 1) {
    takeaways.push(`Key implications for rapid development and deployment in the AI ecosystem.`);
  }

  return {
    tldr: tldr.length > 250 ? tldr.slice(0, 247) + '...' : tldr,
    takeaways: takeaways.map(t => t.length > 160 ? t.slice(0, 157) + '...' : t),
    impact,
    readTimeMinutes,
    generatedWith: 'heuristic',
  };
}

export async function summarizeWithGemini(
  title: string,
  rawContent: string,
  apiKey: string
): Promise<AISummary | null> {
  const cleanContent = cleanHtml(rawContent).slice(0, 4000);

  const prompt = `You are an elite AI tech journalist and principal research analyst for LatentSpace.
Analyze the following AI news development and produce a sharp, deeply insightful executive intelligence briefing.

Article Title: ${title}
Content: ${cleanContent || title}

Respond strictly with a valid JSON object matching this exact schema:
{
  "tldr": "Crisp 2-sentence executive summary explaining the development, technical breakthrough, and core significance.",
  "takeaways": [
    "Actionable bullet point 1 (core innovation, benchmark delta, or concrete milestone)",
    "Actionable bullet point 2 (strategic/market/compute impact)",
    "Actionable bullet point 3 (key implication for engineering, enterprise, or research)"
  ],
  "technicalAnalysis": "Deep technical breakdown of the architecture, compute, model weights, algorithms, or infrastructure specifications.",
  "strategicImplications": "Strategic ecosystem impact, market dynamics, competitive moats, or regulatory considerations.",
  "primaryThesis": "One concise sentence capturing the primary strategic thesis of this development.",
  "impact": "Breakthrough" | "High Impact" | "Notable",
  "readTimeMinutes": number
}`;

  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Gemini API (${model}) returned ${response.status}: ${await response.text()}`);
        continue;
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) continue;

      const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanedText);

      const impactValue: ImpactLevel = 
        parsed.impact === 'Breakthrough' || parsed.impact === 'High Impact' || parsed.impact === 'Notable'
          ? parsed.impact
          : 'High Impact';

      return {
        tldr: parsed.tldr || cleanContent.slice(0, 200),
        takeaways: Array.isArray(parsed.takeaways) && parsed.takeaways.length > 0
          ? parsed.takeaways
          : ['Key frontier intelligence update.'],
        technicalAnalysis: parsed.technicalAnalysis || undefined,
        strategicImplications: parsed.strategicImplications || undefined,
        primaryThesis: parsed.primaryThesis || undefined,
        impact: impactValue,
        readTimeMinutes: Number(parsed.readTimeMinutes) || Math.max(2, Math.ceil((cleanContent.split(/\s+/).length + 100) / 140)),
        generatedWith: 'gemini',
      };
    } catch (error) {
      console.error(`Failed to summarize with Gemini (${model}):`, error);
    }
  }

  return null;
}

