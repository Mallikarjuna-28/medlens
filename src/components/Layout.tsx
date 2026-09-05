import React from 'react';
import { Disclaimer } from './Disclaimer';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg p-1" aria-label="MedLens home">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              MedLens
            </span>
          </a>
          <span className="text-slate-600 text-sm ml-1 hidden sm:block">Clinical Information Intelligence</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
              ● Live
            </span>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="mb-6">
          <Disclaimer />
        </div>
        {children}
      </main>

      <footer className="border-t border-white/10 py-4 text-center text-sm text-slate-600">
        <p>MedLens — For organizational purposes only. Not a medical diagnosis tool.</p>
      </footer>
    </div>
  );
}
