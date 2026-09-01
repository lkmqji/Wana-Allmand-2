import React, { useState } from 'react';
import { Copy, Check, Download, ExternalLink, Sliders, RefreshCw, FileCode, CheckCircle, Info } from 'lucide-react';
import { ExtractionOptions } from '../types';

interface LatexViewerProps {
  latexCode: string;
  onCopyLatex: () => void;
  copiedLatex: boolean;
  onDownloadTex: () => void;
  options: ExtractionOptions;
  onOptionsChange: (opts: ExtractionOptions) => void;
  onRequeryLatex: () => void;
}

export const LatexViewer: React.FC<LatexViewerProps> = ({
  latexCode,
  onCopyLatex,
  copiedLatex,
  onDownloadTex,
  options,
  onOptionsChange,
  onRequeryLatex,
}) => {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [copiedOverleafGuide, setCopiedOverleafGuide] = useState(false);

  const lines = latexCode.split('\n');

  const handleOpenOverleaf = () => {
    onCopyLatex();
    setCopiedOverleafGuide(true);

    // Create a dynamic form to submit LaTeX snippet to Overleaf API via POST
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';

    const snipInput = document.createElement('input');
    snipInput.type = 'hidden';
    snipInput.name = 'snip';
    snipInput.value = latexCode;
    form.appendChild(snipInput);

    const snipNameInput = document.createElement('input');
    snipNameInput.type = 'hidden';
    snipNameInput.name = 'snip_name';
    snipNameInput.value = 'Vocabulaire_Allemand.tex';
    form.appendChild(snipNameInput);

    const engineInput = document.createElement('input');
    engineInput.type = 'hidden';
    engineInput.name = 'engine';
    engineInput.value = 'xelatex';
    form.appendChild(engineInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => setCopiedOverleafGuide(false), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FileCode className="w-4 h-4" />
            <span>Structure & Layout LaTeX de Référence</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Code LaTeX Prêt à la Compilation (A4, longtable, booktabs)
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Ce code reproduit exactement la mise en page : en-têtes récurrents sur multi-pages (<code className="text-indigo-300">\endhead</code>), gestion des coupures, séparation booktabs et shading <code className="text-indigo-300">\rowcolor</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
              showCustomizer
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Personnaliser Style</span>
          </button>

          <button
            onClick={onCopyLatex}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {copiedLatex ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Code Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier le Code</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadTex}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>.tex</span>
          </button>

          <button
            onClick={handleOpenOverleaf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            title="Copie le code et ouvre Overleaf"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ouvrir sur Overleaf</span>
          </button>
        </div>
      </div>

      {copiedOverleafGuide && (
        <div className="p-4 bg-emerald-900/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Code LaTeX copié dans le presse-papier !</strong> Collez-le dans un nouveau projet sur Overleaf.com pour compiler instantanément le PDF.
          </span>
        </div>
      )}

      {/* Style Customizer Panel */}
      {showCustomizer && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Paramètres de Mise en Page LaTeX</span>
            </h4>
            <button
              onClick={onRequeryLatex}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Appliquer les modifications</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Header Color */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Couleur d'en-tête (\rowcolor)
              </label>
              <select
                value={options.headerColor}
                onChange={(e) => onOptionsChange({ ...options, headerColor: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono text-slate-800"
              >
                <option value="gray!15">gray!15 (Gris standard)</option>
                <option value="blue!15">blue!15 (Bleu doux)</option>
                <option value="emerald!15">emerald!15 (Vert éméraude)</option>
                <option value="amber!15">amber!15 (Jaune ambré)</option>
                <option value="purple!15">purple!15 (Violet doux)</option>
              </select>
            </div>

            {/* Column Width Source */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Largeur col. 1 (Français)
              </label>
              <input
                type="text"
                value={options.columnWidthSource}
                onChange={(e) => onOptionsChange({ ...options, columnWidthSource: e.target.value })}
                placeholder="ex: 8cm"
                className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono text-slate-800"
              />
            </div>

            {/* Column Width Target */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Largeur col. 2 (Allemand)
              </label>
              <input
                type="text"
                value={options.columnWidthTarget}
                onChange={(e) => onOptionsChange({ ...options, columnWidthTarget: e.target.value })}
                placeholder="ex: 7cm"
                className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono text-slate-800"
              />
            </div>

            {/* Array Stretch */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Espacement (\arraystretch)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="2.0"
                value={options.arrayStretch}
                onChange={(e) => onOptionsChange({ ...options, arrayStretch: parseFloat(e.target.value) || 1.3 })}
                className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200 text-xs">
            <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeArticles !== false}
                onChange={(e) => onOptionsChange({ ...options, includeArticles: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Articles définis (der/die/das)</span>
            </label>

            <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includePlurals !== false}
                onChange={(e) => onOptionsChange({ ...options, includePlurals: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Pluriel des noms (ex: die Rechnung, -en)</span>
            </label>
          </div>
        </div>
      )}

      {/* Code Viewer Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Editor Bar */}
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-semibold text-slate-300">tableau_vocabulaire.tex</span>
          </div>
          <div>{lines.length} lignes</div>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const isComment = line.trim().startsWith('%');
                const isCmd = line.trim().startsWith('\\');

                return (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="pr-4 text-right select-none text-slate-600 text-[11px] w-12 border-r border-slate-800">
                      {idx + 1}
                    </td>
                    <td className="pl-4 whitespace-pre">
                      {isComment ? (
                        <span className="text-slate-500 italic">{line}</span>
                      ) : isCmd ? (
                        <span className="text-indigo-300">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
