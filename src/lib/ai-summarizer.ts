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

  const prompt = `You are an elite AI industry analyst and tech journalist.
Analyze the following AI news article and provide a crisp executive summary in valid JSON format only.

Article Title: ${title}
Content: ${cleanContent}

Respond with strictly JSON matching this structure:
{
  "tldr": "One or two sharp sentences summarizing the core development and why it matters.",
  "takeaways": [
    "Punchy bullet point 1 (core innovation/action)",
    "Punchy bullet point 2 (strategic/market/technical impact)",
    "Punchy bullet point 3 (what to watch next or key takeaway)"
  ],
  "impact": "Breakthrough" | "High" | "Medium" | "Notable",
  "readTimeMinutes": number
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      console.warn(`Gemini API returned ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText);
    return {
      tldr: parsed.tldr,
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      impact: parsed.impact || 'High',
      readTimeMinutes: Number(parsed.readTimeMinutes) || 3,
      generatedWith: 'gemini',
    };
  } catch (error) {
    console.error('Failed to summarize with Gemini:', error);
    return null;
  }
}

