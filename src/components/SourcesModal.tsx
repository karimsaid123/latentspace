'use client';

import React, { useState } from 'react';
import { RSSFeedSource, Category } from '@/types';
import { X, RefreshCw, Plus, Trash2, Key, ExternalLink } from 'lucide-react';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: RSSFeedSource[];
  onToggleSource: (id: string) => void;
  onAddSource: (source: { name: string; feedUrl: string; websiteUrl?: string; category: Category; color: string }) => Promise<boolean>;
  onDeleteSource: (id: string) => void;
  onForceSync: () => void;
  isSyncing: boolean;
  aiMode: 'gemini' | 'heuristic';
  onKeyUpdated: () => void;
}

export default function SourcesModal({
  isOpen,
  onClose,
  sources,
  onToggleSource,
  onAddSource,
  onDeleteSource,
  onForceSync,
  isSyncing,
  aiMode,
  onKeyUpdated,
}: SourcesModalProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'ai'>('sources');
  
  // Add source form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('LLMs & GenAI');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    setIsAdding(true);
    setAddError('');
    try {
      const ok = await onAddSource({
        name: newName.trim(),
        feedUrl: newUrl.trim(),
        category: newCategory,
        color: '#000000',
      });
      if (ok) {
        setNewName('');
        setNewUrl('');
      } else {
        setAddError('INVALID RSS/ATOM FEED URL.');
      }
    } catch (err: any) {
      setAddError(err.message || 'ERROR ADDING FEED.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setIsTestingKey(true);
    setKeyMessage(null);

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setKeyMessage({ type: 'success', text: 'GEMINI 1.5 FLASH CONNECTED.' });
        onKeyUpdated();
      } else {
        setKeyMessage({ type: 'error', text: data.message || 'VALIDATION FAILED.' });
      }
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.message || 'NETWORK ERROR.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#f4f3ef] dark:bg-[#0d0d0d] text-black dark:text-white border-2 border-black dark:border-white z-10 overflow-hidden shadow-2xl font-mono text-xs">
        
        {/* 4 Corner Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-black/15 dark:border-white/15">
          <span className="font-bold uppercase tracking-widest text-xs">
            "SYSTEM CONFIGURATION // SOURCES & AI"
          </span>
          <button
            onClick={onClose}
            className="hover:text-[#ff3b00] cursor-pointer font-bold"
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-black/15 dark:border-white/15 px-6">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 uppercase tracking-wider cursor-pointer ${
              activeTab === 'sources'
                ? 'font-bold border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            [01 RSS FEEDS ({sources.length})]
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 uppercase tracking-wider cursor-pointer ${
              activeTab === 'ai'
                ? 'font-bold border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            [02 AI MODEL CONFIG]
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'sources' ? (
            <div className="space-y-6">
              {/* List */}
              <div className="space-y-2">
                <span className="text-[10px] text-black/50 dark:text-white/50 uppercase block">
                  ACTIVE FEED SPECIMENS:
                </span>
                {sources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black dark:text-white uppercase">
                          {s.name}
                        </span>
                        <span className="text-[9px] text-black/50 dark:text-white/50">
                          [{s.category}]
                        </span>
                      </div>
                      <span className="text-[9px] text-black/40 dark:text-white/40 block truncate max-w-xs">
                        {s.feedUrl}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleSource(s.id)}
                        className={`px-2 py-0.5 text-[10px] font-bold border cursor-pointer uppercase ${
                          s.enabled
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/30 dark:border-white/30 text-black/40 dark:text-white/40'
                        }`}
                      >
                        {s.enabled ? 'ACTIVE' : 'OFF'}
                      </button>

                      {!['openai', 'deepmind', 'techcrunch-ai', 'verge-ai', 'huggingface', 'mit-tech-ai'].includes(s.id) && (
                        <button
                          onClick={() => onDeleteSource(s.id)}
                          className="text-black/40 hover:text-[#ff3b00] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Feed */}
              <form onSubmit={handleAddSource} className="p-4 border border-dashed border-black/30 dark:border-white/30 space-y-3">
                <span className="font-bold uppercase tracking-wider block text-[10px]">
                  + "INJECT NEW RSS FEED"
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="SOURCE NAME (E.G. ANTHROPIC)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="p-2 border border-black/20 dark:border-white/20 bg-transparent text-black dark:text-white uppercase placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <input
                    type="url"
                    placeholder="RSS / ATOM URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                    className="p-2 border border-black/20 dark:border-white/20 bg-transparent text-black dark:text-white uppercase placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="p-2 border border-black/20 dark:border-white/20 bg-transparent text-black dark:text-white uppercase focus:outline-none"
                  >
                    <option value="LLMs & GenAI">LLMs & GenAI</option>
                    <option value="Robotics & Hardware">Robotics & Hardware</option>
                    <option value="Open Source & Research">Open Source & Research</option>
                    <option value="Business & Big Tech">Business & Big Tech</option>
                    <option value="Ethics & Policy">Ethics & Policy</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase hover:bg-[#ff3b00] dark:hover:bg-[#ff3b00] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAdding ? 'PARSING...' : 'ADD FEED'}
                  </button>
                </div>

                {addError && <p className="text-[#ff3b00] text-[10px]">{addError}</p>}
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 border-l-2 border-black dark:border-white bg-black/5 dark:bg-white/5">
                <span className="font-bold block uppercase mb-1">
                  STATUS: {aiMode === 'gemini' ? 'GOOGLE GEMINI 1.5 FLASH (ACTIVE)' : 'HEURISTIC COGNITIVE PARSER (ACTIVE)'}
                </span>
                <p className="text-[11px] text-black/70 dark:text-white/70 leading-relaxed uppercase">
                  THE ENGINE RUNS 100% LOCALLY WITHOUT THIRD-PARTY DEPENDENCIES. CONNECT A GEMINI API KEY TO POWER DEEP FRONTIER SUMMARIZATION.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-black/60 dark:text-white/60 block">
                  GEMINI API KEY:
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 p-2 border border-black/20 dark:border-white/20 bg-transparent text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <button
                    onClick={handleTestKey}
                    disabled={isTestingKey || !apiKey.trim()}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase hover:bg-[#ff3b00] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTestingKey ? 'TESTING...' : 'CONNECT'}
                  </button>
                </div>

                {keyMessage && (
                  <p className={`text-[10px] font-bold ${
                    keyMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#ff3b00]'
                  }`}>
                    {keyMessage.text}
                  </p>
                )}

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-black/50 dark:text-white/50 hover:underline uppercase inline-block"
                >
                  GET FREE API KEY AT GOOGLE AI STUDIO ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/15 dark:border-white/15 flex items-center justify-between">
          <button
            onClick={onForceSync}
            disabled={isSyncing}
            className="hover:text-[#ff3b00] cursor-pointer font-bold uppercase"
          >
            {isSyncing ? '[SYNCING...]' : '[FORCE RE-SYNC ALL]'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase hover:bg-[#ff3b00] transition-colors cursor-pointer"
          >
            DONE
          </button>
        </div>

      </div>
    </div>
  );
}
