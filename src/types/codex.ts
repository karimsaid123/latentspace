export type CodexCategory =
  | 'FOUNDATIONS'
  | 'ARCHITECTURES'
  | 'TRAINING_ALIGNMENT'
  | 'INFERENCE_SYSTEMS'
  | 'FRONTIER_REASONING';

export type CodexLevel = 'BEGINNER' | 'INTERMEDIATE' | 'FRONTIER';

export interface CanonicalPaper {
  title: string;
  arxivId?: string;
  authors: string;
  year: number;
  url: string;
}

export interface CodexEntry {
  id: string;
  slug: string;
  acronym?: string;
  title: string;
  category: CodexCategory;
  level: CodexLevel;
  summary: string;
  technicalDeepDive: string;
  mathematics?: {
    formula: string;
    explanation: string;
  };
  keyTakeaways: string[];
  tradeoffs: {
    advantages: string[];
    limitations: string[];
  };
  canonicalPaper?: CanonicalPaper;
  relatedIds: string[];
  searchKeywords: string[];
}

export interface CodexSearchFilter {
  query?: string;
  category?: CodexCategory | 'ALL';
  level?: CodexLevel | 'ALL';
}

