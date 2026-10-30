'use client';

import React from 'react';

export interface CompanyBrandInfo {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  bgTint: string;
  borderColor: string;
  textColor: string;
}

export const COMPANY_BRANDS: Record<string, CompanyBrandInfo> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OPENAI',
    primaryColor: '#10A37F',
    accentColor: '#059669',
    bgTint: 'rgba(16, 163, 127, 0.08)',
    borderColor: '#10A37F',
    textColor: '#10A37F',
  },
  google: {
    id: 'google',
    name: 'Google DeepMind',
    shortName: 'DEEPMIND',
    primaryColor: '#1A73E8',
    accentColor: '#4285F4',
    bgTint: 'rgba(26, 115, 232, 0.08)',
    borderColor: '#1A73E8',
    textColor: '#1A73E8',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    shortName: 'ANTHROPIC',
    primaryColor: '#D97706',
    accentColor: '#CC785C',
    bgTint: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#D97706',
    textColor: '#B45309',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    shortName: 'MISTRAL',
    primaryColor: '#FF7000',
    accentColor: '#F97316',
    bgTint: 'rgba(255, 112, 0, 0.08)',
    borderColor: '#FF7000',
    textColor: '#EA580C',
  },
  xai: {
    id: 'xai',
    name: 'SpaceX & xAI',
    shortName: 'xAI',
    primaryColor: '#111827',
    accentColor: '#000000',
    bgTint: 'rgba(0, 0, 0, 0.06)',
    borderColor: '#111827',
    textColor: '#111827',
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot AI & Kimi',
    shortName: 'KIMI',
    primaryColor: '#0284C7',
    accentColor: '#0066FF',
    bgTint: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    textColor: '#0284C7',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DEEPSEEK',
    primaryColor: '#1D4ED8',
    accentColor: '#2563EB',
    bgTint: 'rgba(29, 78, 216, 0.08)',
    borderColor: '#1D4ED8',
    textColor: '#1D4ED8',
  },
  zhipu: {
    id: 'zhipu',
    name: 'Zhipu AI',
    shortName: 'ZHIPU',
    primaryColor: '#6366F1',
    accentColor: '#4F46E5',
    bgTint: 'rgba(99, 102, 241, 0.08)',
    borderColor: '#6366F1',
    textColor: '#4F46E5',
  },
  meta: {
    id: 'meta',
    name: 'Meta AI',
    shortName: 'META',
    primaryColor: '#0081FB',
    accentColor: '#0866FF',
    bgTint: 'rgba(0, 129, 251, 0.08)',
    borderColor: '#0081FB',
    textColor: '#0081FB',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA',
    shortName: 'NVIDIA',
    primaryColor: '#76B900',
    accentColor: '#659F00',
    bgTint: 'rgba(118, 185, 0, 0.08)',
    borderColor: '#76B900',
    textColor: '#4D7C0F',
  },
  muse: {
    id: 'muse',
    name: 'Muse AI',
    shortName: 'MUSE',
    primaryColor: '#8B5CF6',
    accentColor: '#7C3AED',
    bgTint: 'rgba(139, 92, 246, 0.08)',
    borderColor: '#8B5CF6',
    textColor: '#7C3AED',
  },
  mimo: {
    id: 'mimo',
    name: 'MiMo AI',
    shortName: 'MIMO',
    primaryColor: '#EA580C',
    accentColor: '#F97316',
    bgTint: 'rgba(234, 88, 12, 0.08)',
    borderColor: '#EA580C',
    textColor: '#EA580C',
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    shortName: 'HF',
    primaryColor: '#F59E0B',
    accentColor: '#D97706',
    bgTint: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#F59E0B',
    textColor: '#B45309',
  },
};

const DEFAULT_BRAND: CompanyBrandInfo = {
  id: 'independent',
  name: 'Frontier Lab',
  shortName: 'LAB',
  primaryColor: '#000000',
  accentColor: '#333333',
  bgTint: 'rgba(0, 0, 0, 0.04)',
  borderColor: '#000000',
  textColor: '#000000',
};

export function getCompanyBrand(rawKey?: string | null): CompanyBrandInfo {
  if (!rawKey) return DEFAULT_BRAND;
  const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (key.includes('openai') || key.includes('gpt') || key.includes('chatgpt')) {
    return COMPANY_BRANDS.openai;
  }
  if (key.includes('deepmind') || key.includes('google') || key.includes('gemini')) {
    return COMPANY_BRANDS.google;
  }
  if (key.includes('anthropic') || key.includes('claude')) {
    return COMPANY_BRANDS.anthropic;
  }
  if (key.includes('mistral') || key.includes('mixtral') || key.includes('codestral')) {
    return COMPANY_BRANDS.mistral;
  }
  if (key.includes('xai') || key.includes('spacex') || key.includes('grok') || key.includes('elon')) {
    return COMPANY_BRANDS.xai;
  }
  if (key.includes('moonshot') || key.includes('kimi')) {
    return COMPANY_BRANDS.moonshot;
  }
  if (key.includes('deepseek')) {
    return COMPANY_BRANDS.deepseek;
  }
  if (key.includes('zhipu') || key.includes('glm')) {
    return COMPANY_BRANDS.zhipu;
  }
  if (key.includes('meta') || key.includes('llama') || key.includes('fair')) {
    return COMPANY_BRANDS.meta;
  }
  if (key.includes('nvidia') || key.includes('blackwell')) {
    return COMPANY_BRANDS.nvidia;
  }
  if (key.includes('muse')) {
    return COMPANY_BRANDS.muse;
  }
  if (key.includes('mimo')) {
    return COMPANY_BRANDS.mimo;
  }
  if (key.includes('huggingface') || key.includes('hf')) {
    return COMPANY_BRANDS.huggingface;
  }

  return DEFAULT_BRAND;
}

export function CompanyLogo({
  brandId,
  className = 'w-4 h-4',
  colorOverride,
}: {
  brandId?: string;
  className?: string;
  colorOverride?: string;
}) {
  const brand = getCompanyBrand(brandId);
  const color = colorOverride || brand.primaryColor;

  switch (brand.id) {
    case 'openai':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
        </svg>
      );

    case 'google':
      return (
        <svg viewBox="0 0 24 24" className={className}>
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.43 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      );

    case 'anthropic':
      return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
          <path d="M13.827 3.5h3.693L24 20.5h-3.693l-1.92-4.735H12.44L10.52 20.5H6.827L13.827 3.5zm2.347 9.533L14.733 8.36 13.293 13.033h2.881zM3.467 20.5L7.16 11.453l1.867 4.547L6.853 20.5H3.467z" />
        </svg>
      );

    case 'mistral':
      return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
          <rect x="2" y="3" width="4" height="4" />
          <rect x="18" y="3" width="4" height="4" />
          <rect x="2" y="9" width="4" height="4" />
          <rect x="6" y="9" width="4" height="4" />
          <rect x="14" y="9" width="4" height="4" />
          <rect x="18" y="9" width="4" height="4" />
          <rect x="2" y="15" width="20" height="4" />
        </svg>
      );

    case 'xai':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    case 'moonshot':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
          <circle cx="16.5" cy="7.5" r="1.5" fill={color} />
        </svg>
      );

    case 'deepseek':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M2 12c2.5-4 7-6 11-4 3 1.5 5 4.5 7 4-1.5 3-4.5 5-8 5-4.5 0-8-2-10-5z" fill={color} fillOpacity="0.2" />
          <path d="M13 8c1.5-2.5 4.5-3.5 7-3-1 2-2 4-4 4.5" />
          <circle cx="6" cy="11" r="1" fill={color} />
        </svg>
      );

    case 'zhipu':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
          <path d="M4 5h16L8 19h12" />
          <circle cx="8" cy="5" r="1.5" fill={color} />
          <circle cx="16" cy="19" r="1.5" fill={color} />
        </svg>
      );

    case 'meta':
      return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
          <path d="M16.94 4.88C15.06 4.88 13.34 5.92 12 7.37c-1.34-1.45-3.06-2.49-4.94-2.49C3.15 4.88 0 8.03 0 11.92c0 4.07 3.32 7.2 7.33 7.2 2.37 0 4.2-1.07 5.67-2.67 1.47 1.6 3.3 2.67 5.67 2.67 4.01 0 7.33-3.13 7.33-7.2 0-3.89-3.15-7.04-7.06-7.04zm-9.88 12c-2.73 0-4.95-2.22-4.95-4.96 0-2.73 2.22-4.95 4.95-4.95 1.7 0 3.25.9 4.14 2.35l.8 1.3-.8 1.3c-.89 1.46-2.44 2.96-4.14 2.96zm9.88 0c-1.7 0-3.25-1.5-4.14-2.96l-.8-1.3.8-1.3c.89-1.45 2.44-2.35 4.14-2.35 2.73 0 4.95 2.22 4.95 4.95 0 2.74-2.22 4.96-4.95 4.96z" />
        </svg>
      );

    case 'nvidia':
      return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
          <path d="M8.9 7.7c-2.4.6-4.2 2.5-4.5 4.9-.3 2.8 1.4 5.3 4.1 6.1 2.3.7 4.7.1 6.4-1.5l1.9 1.9c-2.4 2.2-5.7 3.1-8.9 2.2-4-1.2-6.6-4.9-6.1-9.1.5-3.8 3.3-6.8 7.1-7.7 2.4-.6 5-.2 7.1 1l-1.9 2.1c-1.5-.7-3.4-.9-5.2-.4zm4.2 3.1c-1.2.3-2.1 1.3-2.3 2.5-.2 1.4.7 2.7 2.1 3.1 1.2.3 2.4 0 3.3-.8l1.7 1.7c-1.3 1.2-3.1 1.7-4.8 1.3-2.2-.6-3.7-2.7-3.4-5 .3-2.1 2-3.7 4.1-4.1 1.3-.3 2.7-.1 3.8.5l-1.6 1.7c-.8-.5-1.9-.6-2.9-.3zm2.5-1.8l2.2-2.3c2.5 1.5 4.2 4.1 4.5 7.1.3 3.4-1.3 6.6-4.2 8.3l-1.8-1.8c2.1-1.3 3.4-3.6 3.1-6.1-.2-2.2-1.6-4.2-3.8-5.2z" />
        </svg>
      );

    case 'huggingface':
      return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M8 10h.01M16 10h.01M8 14c1.5 2 6.5 2 8 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
  }
}
