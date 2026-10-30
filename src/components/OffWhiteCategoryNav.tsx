'use client';

import React from 'react';

interface OffWhiteCategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categoryCounts: Record<string, number>;
  sortOption: string;
  onChangeSort: (sort: string) => void;
}

const CATEGORIES = [
  { id: 'All', code: '01', label: 'ALL' },
  { id: 'LLMs & GenAI', code: '02', label: 'LLMs & GENAI' },
  { id: 'Robotics & Hardware', code: '03', label: 'ROBOTICS' },
  { id: 'Open Source & Research', code: '04', label: 'OPEN SOURCE' },
  { id: 'Business & Big Tech', code: '05', label: 'BUSINESS' },
  { id: 'Ethics & Policy', code: '06', label: 'POLICY' },
];

export default function OffWhiteCategoryNav({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  sortOption,
  onChangeSort,
}: OffWhiteCategoryNavProps) {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 border-b border-black/15 dark:border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs uppercase tracking-wider select-none">
      
      {/* Category Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`transition-colors whitespace-nowrap cursor-pointer py-1 ${
                isSelected
                  ? 'font-bold text-black dark:text-white border-b-2 border-black dark:border-white'
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              [{cat.code} {cat.label} // {count}]
            </button>
          );
        })}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-3 text-black/60 dark:text-white/60 text-[11px] shrink-0">
        <span>SORT:</span>
        <button
          onClick={() => onChangeSort('latest')}
          className={`cursor-pointer hover:text-black dark:hover:text-white ${
            sortOption === 'latest' ? 'text-black dark:text-white font-bold underline' : ''
          }`}
        >
          [LATEST]
        </button>
        <button
          onClick={() => onChangeSort('impact')}
          className={`cursor-pointer hover:text-black dark:hover:text-white ${
            sortOption === 'impact' ? 'text-[#ff3b00] font-bold underline' : ''
          }`}
        >
          [IMPACT ★]
        </button>
        <button
          onClick={() => onChangeSort('readTime')}
          className={`cursor-pointer hover:text-black dark:hover:text-white ${
            sortOption === 'readTime' ? 'text-black dark:text-white font-bold underline' : ''
          }`}
        >
          [READ-TIME]
        </button>
      </div>

    </div>
  );
}
