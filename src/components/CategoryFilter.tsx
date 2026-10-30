'use client';

import React from 'react';
import { 
  Cpu, 
  Bot, 
  GitBranch, 
  Building2, 
  ShieldAlert, 
  Layers,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { Category } from '@/types';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categoryCounts: Record<string, number>;
  sortOption: string;
  onChangeSort: (sort: string) => void;
}

const CATEGORIES: { label: string; value: string; icon: any }[] = [
  { label: 'Alles', value: 'All', icon: Layers },
  { label: 'LLMs & GenAI', value: 'LLMs & GenAI', icon: Cpu },
  { label: 'Robotics & Hardware', value: 'Robotics & Hardware', icon: Bot },
  { label: 'Open Source & Research', value: 'Open Source & Research', icon: GitBranch },
  { label: 'Business & Big Tech', value: 'Business & Big Tech', icon: Building2 },
  { label: 'Ethics & Policy', value: 'Ethics & Policy', icon: ShieldAlert },
];

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  sortOption,
  onChangeSort,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.value;
          const count = categoryCounts[cat.value] || 0;

          return (
            <button
              key={cat.value}
              onClick={() => onSelectCategory(cat.value)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-violet-800 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sort Selector */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sorteren:
        </span>
        <select
          value={sortOption}
          onChange={(e) => onChangeSort(e.target.value)}
          aria-label="Sorteer artikelen"
          className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
        >
          <option value="latest">Nieuwste eerst</option>
          <option value="impact">Hoogste Impact 🔥</option>
          <option value="readTime">Korte leestijd (&lt; 3 min) ⚡</option>
        </select>
      </div>
    </div>
  );
}

