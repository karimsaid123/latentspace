'use client';

import React, { useState } from 'react';
import { 
  X, 
  Rss, 
  Sparkles, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Key,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { RSSFeedSource, Category } from '@/types';

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
  
  // New source form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('LLMs & GenAI');
  const [newColor, setNewColor] = useState('#8b5cf6');
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
        color: newColor,
      });
      if (ok) {
        setNewName('');
        setNewUrl('');
      } else {
        setAddError('Kon deze RSS feed niet valideren. Controleer de URL.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Fout bij toevoegen');
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
        setKeyMessage({ type: 'success', text: 'Gemini API sleutel is succesvol gekoppeld en getest!' });
        onKeyUpdated();
      } else {
        setKeyMessage({ type: 'error', text: data.message || 'Kon sleutel niet valideren.' });
      }
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.message || 'Netwerkfout bij testen van sleutel.' });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Beheer Bronnen & AI Model
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950/30">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sources'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Nieuwsbronnen (RSS Feeds) ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Samenvatter & API Sleutel
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'sources' ? (
            <div>
              {/* Sources List */}
              <div className="space-y-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Geconfigureerde Bronnen
                </span>
                
                {sources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {s.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {s.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 line-clamp-1">
                          {s.feedUrl}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Toggle switch */}
                      <button
                        onClick={() => onToggleSource(s.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          s.enabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            s.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Delete button (if custom) */}
                      {!['openai', 'deepmind', 'techcrunch-ai', 'verge-ai', 'huggingface', 'mit-tech-ai'].includes(s.id) && (
                        <button
                          onClick={() => onDeleteSource(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Verwijder bron"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Feed Form */}
              <form onSubmit={handleAddSource} className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-3">
                  + Eigen RSS Feed Toevoegen
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                      Naam van Bron
                    </label>
                    <input
                      type="text"
                      placeholder="bijv. Anthropic Blog"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                      RSS / Atom Feed URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../rss.xml"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                      Standaard Categorie
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as Category)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="LLMs & GenAI">LLMs & GenAI</option>
                      <option value="Robotics & Hardware">Robotics & Hardware</option>
                      <option value="Open Source & Research">Open Source & Research</option>
                      <option value="Business & Big Tech">Business & Big Tech</option>
                      <option value="Ethics & Policy">Ethics & Policy</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                      Thema Kleur
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs text-slate-400 font-mono">{newColor}</span>
                    </div>
                  </div>
                </div>

                {addError && (
                  <p className="text-xs text-rose-500 mb-3">{addError}</p>
                )}

                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAdding ? 'Valideren...' : 'Bron Toevoegen'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Status Banner */}
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Huidige AI Samenvattingsmodus:{' '}
                    <span className="text-violet-600 dark:text-violet-400 font-mono">
                      {aiMode === 'gemini' ? 'Google Gemini 1.5 Flash ✦' : 'Smart Heuristic Analyzer'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Standaard draait de website op een zelfstandige heuristische AI-pijplijn die 100% lokaal en gratis werkt zonder sleutels. Voor geavanceerde neurale samenvattingen en classificatie kun je hieronder je gratis Gemini API sleutel invoeren.
                  </p>
                </div>
              </div>

              {/* API Key Form */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  Gemini API Sleutel (Optioneel)
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Plak hier je AI Studio API sleutel (AIza...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <button
                    onClick={handleTestKey}
                    disabled={isTestingKey || !apiKey.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isTestingKey ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>Koppelen & Testen</span>
                  </button>
                </div>

                {keyMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      keyMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {keyMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{keyMessage.text}</span>
                  </div>
                )}

                <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                  Nog geen Gemini sleutel?{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-500 hover:underline inline-flex items-center gap-1"
                  >
                    Krijg hier gratis een sleutel bij Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onForceSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchroniseren...' : 'Forceer Volledige Resync'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer"
          >
            Klaar
          </button>
        </div>

      </div>
    </div>
  );
}
