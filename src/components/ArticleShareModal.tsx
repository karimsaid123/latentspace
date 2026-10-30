'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Article } from '@/types';
import { getCompanyBrand, CompanyLogo } from '@/components/CompanyBrand';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Send
} from 'lucide-react';

interface ArticleShareModalProps {
  article: Article;
  isOpen: boolean;
  onClose: () => void;
}

export default function ArticleShareModal({
  article,
  isOpen,
  onClose,
}: ArticleShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const brand = getCompanyBrand(article.lab || article.source?.name);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://latentspace.ai';
  const shareUrl = `${origin}/?article=${article.id}`;

  const cleanSummary = (article.aiSummary?.tldr || article.contentSnippet || '').trim();
  const labText = article.lab || 'Frontier AI';
  const sourceText = article.source?.name || 'LatentSpace';
  
  // Clean formatted template text for clipboard / social sharing
  const formattedPostText = `⚡ LATENTSPACE // AI DISPATCH\n\n${article.title.toUpperCase()}\n\nLAB: [${labText}] // SOURCE: [${sourceText}]\nIMPACT: [${article.aiSummary?.impact || 'NOTABLE'}]\n\n"${cleanSummary}"\n\nRead the full dossier on LatentSpace:\n${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (_) {}
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedPostText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2200);
    } catch (_) {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `[LatentSpace] ${article.title}`,
          text: `"${cleanSummary}"`,
          url: shareUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `⚡ [${labText}] ${article.title}\n\n"${cleanSummary.slice(0, 160)}${cleanSummary.length > 160 ? '...' : ''}"`
    );
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`*${article.title}*\n\n${cleanSummary}\n\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const formattedDate = new Date(article.pubDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm select-none animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Container Box in Pure Swiss Monospace Theme */}
      <div className="relative w-full max-w-2xl bg-[#faf9f6] text-black border border-black z-10 overflow-hidden shadow-2xl animate-modal-in flex flex-col">
        
        {/* 4 Corner Bounding Box Square Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black z-30" />

        {/* Header Row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black font-mono text-[9px] uppercase tracking-widest text-black/60 bg-black/[0.02]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-black inline-block" />
            <span className="font-bold text-black">SHARE // ARTICLE TEMPLATE</span>
            <span className="text-black/40">[{article.id.slice(0, 8)}]</span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Share Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          
          {/* THE OFFICIAL SHARABLE ARTICLE TEMPLATE CARD */}
          <div className="relative p-6 sm:p-7 border border-black bg-white shadow-sm transition-all">
            {/* 4 Corner Mini Square Handles for Template Card */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

            {/* Template Top Tag & Lab Identity */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10 font-mono text-[9px] tracking-widest uppercase">
              <div className="flex items-center gap-2.5">
                {/* Brand Logo & Name */}
                <div
                  className="w-6 h-6 border flex items-center justify-center p-0.5 shrink-0"
                  style={{
                    backgroundColor: brand.bgTint,
                    borderColor: brand.borderColor,
                  }}
                >
                  <CompanyLogo brandId={brand.id} className="w-3.5 h-3.5" />
                </div>
                <span className="font-black text-black" style={{ color: brand.textColor }}>
                  [{brand.name.toUpperCase()}]
                </span>
                <span className="text-black/30">•</span>
                <span className="text-black/50">{sourceText}</span>
              </div>

              <div className="flex items-center gap-2 text-black/40">
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="font-bold text-black">
                  {article.entryType === 'RESEARCH_PAPER' ? '[RESEARCH]' : '[DISPATCH]'}
                </span>
              </div>
            </div>

            {/* Article Headline */}
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.03em] leading-tight text-black mt-4 mb-4">
              {article.title}
            </h3>

            {/* Template Quote / TL;DR Box */}
            <div 
              className="p-4 bg-[#faf9f6] border-l-2 font-mono text-xs leading-relaxed text-black/90 uppercase my-4"
              style={{ borderLeftColor: brand.primaryColor }}
            >
              <span className="text-[8px] font-bold tracking-widest text-black/40 block mb-1">
                EXECUTIVE SUMMARY:
              </span>
              {cleanSummary}
            </div>

            {/* Telemetry Badge Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10 font-mono text-[9px] uppercase tracking-wider text-black/50">
              <div className="flex items-center gap-3">
                <span>IMPACT: <strong className="text-black">{article.aiSummary?.impact || 'NOTABLE'}</strong></span>
                <span>•</span>
                <span>SECTOR: <strong className="text-black">{labText}</strong></span>
              </div>

              <div className="font-bold text-black flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-black rounded-full" />
                <span>LATENTSPACE.AI</span>
              </div>
            </div>

          </div>

          {/* QUICK SHARING CONTROLS */}
          <div className="space-y-4">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/50 block">
              QUICK SHARE VIA:
            </span>

            {/* Social Share Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[10px] uppercase font-bold">
              {/* X / Twitter */}
              <button
                onClick={handleShareX}
                className="p-2.5 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X / TWITTER</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleShareLinkedIn}
                className="p-2.5 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span>LINKEDIN</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="p-2.5 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WHATSAPP</span>
              </button>

              {/* Native System Share */}
              <button
                onClick={handleNativeShare}
                className="p-2.5 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>MORE...</span>
              </button>
            </div>

            {/* Direct Link Copy & Formatted Template Copy */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleCopyLink}
                className={`flex-1 py-3 px-4 border border-black font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  copiedLink
                    ? 'bg-black text-[#faf9f6]'
                    : 'bg-black text-[#faf9f6] hover:bg-black/85'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'LINK COPIED! ✓' : 'COPY DIRECT ARTICLE LINK'}</span>
              </button>

              <button
                onClick={handleCopyText}
                className={`py-3 px-4 border border-black font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  copiedText
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
                title="Copy formatted summary to clipboard"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'TEXT COPIED! ✓' : 'COPY FORMATTED SUMMARY'}</span>
              </button>
            </div>

            {/* Display Direct URL for Transparency */}
            <div className="p-2.5 bg-black/[0.02] border border-black/10 font-mono text-[9px] text-black/60 truncate select-all flex items-center justify-between">
              <span className="truncate">{shareUrl}</span>
              <span className="font-bold text-black shrink-0 ml-2">[URL]</span>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-black/10 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-black/40 bg-black/[0.01]">
          <span>LATENTSPACE // VERIFIED FRONTIER AI DISPATCH</span>
          <button
            onClick={onClose}
            className="font-bold text-black hover:underline cursor-pointer"
          >
            [CLOSE]
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
