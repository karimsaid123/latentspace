'use client';

import React, { memo } from 'react';
import LiveClock from './LiveClock';
import { getDictionary, Locale } from '@/lib/i18n';

interface FooterProps {
  locale?: Locale;
}

const Footer = memo(function Footer({ locale = 'en' }: FooterProps) {
  const dict = getDictionary(locale);
  return (
    <footer className="w-full border-t border-black/10 py-16 font-mono text-[9px] uppercase tracking-widest text-black/50 select-none">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>LATENT SPACE</span>
        <span className="flex items-center gap-2 text-black/80 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <LiveClock prefix={dict.footer.deviceTime} useLocaleDefault />
        </span>
        <span>{dict.footer.edition}</span>
      </div>
    </footer>
  );
});

export default Footer;
