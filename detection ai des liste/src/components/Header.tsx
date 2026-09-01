import React from 'react';
import { FileCode, Sparkles, RefreshCw, Settings, FileText, Download, Copy, Check, FileCheck } from 'lucide-react';

interface HeaderProps {
  onLoadSample: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
  activeTab: 'table' | 'latex' | 'preview';
  setActiveTab: (tab: 'table' | 'latex' | 'preview') => void;
  totalWords: number;
  onCopyLatex: () => void;
  copiedLatex: boolean;
  onDownloadTex: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onReset,
  onOpenSettings,
  activeTab,
  setActiveTab,
  totalWords,
  onCopyLatex,
  copiedLatex,
  onDownloadTex,
}) => {
  return (
    <header className="bg-[#FAF8F5] border-b border-[#E5E1DA] text-[#1A1A1A] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Editorial Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-[#1A1A1A] flex items-center justify-center text-[#FDFCFB]">
            <FileCode className="w-5 h-5 text-[#FAF8F5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif italic font-bold text-3xl tracking-tight text-[#1A1A1A]">
                LexiTeX
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] bg-[#EAE7E1] text-[#4A453E] px-2 py-0.5 rounded-sm border border-[#D8D3C9]">
                FR / EN / AR &rarr; DE
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8273]">
              Extraction PDF/Images & Générateur LaTeX
            </p>
          </div>
        </div>

        {/* View Navigation Tabs */}
        {totalWords > 0 && (
          <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-widest font-bold">
            <button
              onClick={() => setActiveTab('table')}
              className={`pb-1 transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'table'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#8C8273] hover:text-[#1A1A1A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vocabulaire ({totalWords})</span>
            </button>

            <button
              onClick={() => setActiveTab('latex')}
              className={`pb-1 transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'latex'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#8C8273] hover:text-[#1A1A1A]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Code LaTeX</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-1 transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'preview'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#8C8273] hover:text-[#1A1A1A]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export PDF</span>
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {totalWords > 0 ? (
            <>
              <button
                onClick={onCopyLatex}
                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EAE7E1] text-[#1A1A1A] border border-[#E5E1DA] rounded-sm text-[11px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5"
                title="Copier le code LaTeX"
              >
                {copiedLatex ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>

              <button
                onClick={onDownloadTex}
                className="hidden sm:flex px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-[11px] uppercase font-bold tracking-wider transition-all items-center gap-1.5"
                title="Télécharger le fichier .tex"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.tex</span>
              </button>

              <button
                onClick={onOpenSettings}
                className="p-2 text-[#4A453E] hover:text-[#1A1A1A] hover:bg-[#EAE7E1] rounded-sm transition-colors border border-[#E5E1DA]"
                title="Filtres & Options"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={onReset}
                className="p-2 text-[#8C8273] hover:text-rose-700 hover:bg-[#FCE8E6] rounded-sm transition-colors border border-[#E5E1DA]"
                title="Nouveau fichier"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onLoadSample}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tester Exemple</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
