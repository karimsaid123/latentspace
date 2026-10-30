import { RSSFeedSource } from '@/types';

export const DEFAULT_SOURCES: RSSFeedSource[] = [
  {
    id: 'openai',
    name: 'OpenAI News',
    feedUrl: 'https://openai.com/news/rss.xml',
    websiteUrl: 'https://openai.com/news',
    category: 'LLMs & GenAI',
    color: '#10a37f', // OpenAI emerald
    enabled: true,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    websiteUrl: 'https://deepmind.google/discover/blog',
    category: 'LLMs & GenAI',
    color: '#3b82f6', // Google blue
    enabled: true,
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    websiteUrl: 'https://techcrunch.com/category/artificial-intelligence/',
    category: 'Business & Big Tech',
    color: '#059669', // TechCrunch green
    enabled: true,
  },
  {
    id: 'verge-ai',
    name: 'The Verge AI',
    feedUrl: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    websiteUrl: 'https://www.theverge.com/ai-artificial-intelligence',
    category: 'LLMs & GenAI',
    color: '#e11d48', // Verge rose/red
    enabled: true,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Blog',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    websiteUrl: 'https://huggingface.co/blog',
    category: 'Open Source & Research',
    color: '#f59e0b', // Hugging Face yellow/amber
    enabled: true,
  },
  {
    id: 'mit-tech-ai',
    name: 'MIT Technology Review',
    feedUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    websiteUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    category: 'Ethics & Policy',
    color: '#6366f1', // Indigo
    enabled: true,
  },
];

