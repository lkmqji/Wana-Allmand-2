import React from 'react';
import { Printer, Eye, FileCode } from 'lucide-react';
import { VocabItem, ExtractionOptions } from '../types';

interface PdfPreviewProps {
  items: VocabItem[];
  options: ExtractionOptions;
  onDownloadTex: () => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  items,
  options,
  onDownloadTex,
}) => {
  // Open standalone HTML in new window / blob download for 100% reliable printing
  const handleOpenPrintTab = () => {
    const element = document.getElementById('pdf-paper-container');
    if (!element) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Tableau de Vocabulaire Allemand - Version Imprimable</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print {
        body { margin: 0; padding: 10px !important; background: white !important; }
        .no-print { display: none !important; }
        .page-break-inside-avoid { break-inside: avoid; }
      }
    </style>
  </head>
  <body class="bg-slate-100 p-6 font-serif text-slate-900 min-h-screen">
    <div class="no-print max-w-[210mm] mx-auto mb-6 bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl">
      <div class="text-sm font-sans font-medium flex items-center gap-2">
        <span>📄</span>
        <span>Version d'impression haute définition</span>
      </div>
      <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold font-sans cursor-pointer shadow-md transition-all flex items-center gap-2">
        🖨️ Imprimer la page (Ctrl + P)
      </button>
    </div>
    <div class="bg-white p-8 sm:p-12 max-w-[210mm] mx-auto shadow-2xl rounded-xl border border-slate-200">
      ${element.innerHTML}
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const printWin = window.open(blobUrl, '_blank');
    if (!printWin) {
      // Fallback if popup is blocked: download printable HTML
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'tableau_vocabulaire_imprimable.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const nouns = items.filter((i) => i.category === 'NOMS');
  const verbs = items.filter((i) => i.category === 'VERBES');
  const adjs = items.filter((i) => i.category === 'ADJECTIFS_ADVERBES');
  const exprs = items.filter((i) => i.category === 'EXPRESSIONS' || i.category === 'EXPRESSIONS_UTILES');

  const renderTrilingualText = (item: VocabItem) => {
    const parts = item.sourceText ? item.sourceText.split(/\s*\|\s*/) : [];
    const fr = item.frenchText || parts[0] || item.sourceText;
    const en = item.englishText || parts[1] || '';
    const ar = item.arabicText || parts[2] || '';

    return (
      <div className="space-y-1 my-0.5">
        {fr && (
          <div className="font-sans font-medium text-slate-900 text-xs flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 uppercase print:border-slate-300">
              FR
            </span>
            <span>{fr}</span>
          </div>
        )}
        {en && (
          <div className="font-sans text-slate-600 text-[11px] flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 uppercase print:border-slate-300">
              EN
            </span>
            <span>{en}</span>
          </div>
        )}
        {ar && (
          <div className="font-serif font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 uppercase print:border-slate-300">
              AR
            </span>
            <span>{ar}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Control Action Bar */}
      <div className="print:hidden bg-slate-900 text-white rounded-2xl p-4 px-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Aperçu Document PDF (A4)</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                {items.length} mots
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ouvrez votre tableau dans un nouvel onglet pour une impression parfaite ou téléchargez le fichier .TEX
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleOpenPrintTab}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-200" />
            <span>Imprimer (Nouvel Onglet)</span>
          </button>

          <button
            onClick={onDownloadTex}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Télécharger le fichier source LaTeX (.tex)"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>Code Source .TEX</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div
        id="pdf-paper-container"
        className="bg-white rounded-xl shadow-2xl border border-slate-200/90 p-8 sm:p-12 max-w-[210mm] mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-slate-900 font-serif"
      >
        {/* Document Header */}
        <div className="mb-6 pb-4 border-b border-slate-300 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
              Tableau de Vocabulaire Allemand (Trilingue)
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Français • English • العربية &rarr; Allemand
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-sans">
            LexiTeX Generator
          </div>
        </div>

        {/* Document Longtable */}
        <table className="w-full text-left border-collapse font-serif text-sm">
          {/* Table Header (booktabs style toprule + header) */}
          <thead>
            <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-sans font-bold text-xs uppercase tracking-wider">
              <th className="py-3 px-4 w-3/5">
                Traductions (Français / English / العربية)
              </th>
              <th className="py-3 px-4 w-2/5">
                Allemand (avec article/infinitif)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* Category: NOMS */}
            {nouns.length > 0 && (
              <>
                <tr className="page-break-inside-avoid">
                  <td
                    colSpan={2}
                    className="py-3 px-2 text-center bg-slate-50 border-t-2 border-b-2 border-slate-900 font-sans font-bold text-xs uppercase tracking-wider text-slate-900"
                  >
                    NOMS (Substantive)
                  </td>
                </tr>
                {nouns.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 page-break-inside-avoid">
                    <td className="py-2.5 px-4">{renderTrilingualText(item)}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-950 text-sm">
                      {item.germanText}{' '}
                      {item.notes && (
                        <span className="italic font-normal text-xs text-slate-600">
                          ({item.notes})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Category: VERBES */}
            {verbs.length > 0 && (
              <>
                <tr className="page-break-inside-avoid">
                  <td
                    colSpan={2}
                    className="py-3 px-2 text-center bg-slate-50 border-t-2 border-b-2 border-slate-900 font-sans font-bold text-xs uppercase tracking-wider text-slate-900"
                  >
                    VERBES (Verben)
                  </td>
                </tr>
                {verbs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 page-break-inside-avoid">
                    <td className="py-2.5 px-4">{renderTrilingualText(item)}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-950 text-sm">
                      {item.germanText}{' '}
                      {item.notes && (
                        <span className="italic font-normal text-xs text-slate-600">
                          ({item.notes})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Category: ADJECTIFS & ADVERBES */}
            {adjs.length > 0 && (
              <>
                <tr className="page-break-inside-avoid">
                  <td
                    colSpan={2}
                    className="py-3 px-2 text-center bg-slate-50 border-t-2 border-b-2 border-slate-900 font-sans font-bold text-xs uppercase tracking-wider text-slate-900"
                  >
                    ADJECTIFS & ADVERBES
                  </td>
                </tr>
                {adjs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 page-break-inside-avoid">
                    <td className="py-2.5 px-4">{renderTrilingualText(item)}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-950 text-sm">
                      {item.germanText}{' '}
                      {item.notes && (
                        <span className="italic font-normal text-xs text-slate-600">
                          ({item.notes})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Category: EXPRESSIONS UTILES */}
            {exprs.length > 0 && (
              <>
                <tr className="page-break-inside-avoid">
                  <td
                    colSpan={2}
                    className="py-3 px-2 text-center bg-slate-50 border-t-2 border-b-2 border-slate-900 font-sans font-bold text-xs uppercase tracking-wider text-slate-900"
                  >
                    EXPRESSIONS UTILES
                  </td>
                </tr>
                {exprs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 page-break-inside-avoid">
                    <td className="py-2.5 px-4">{renderTrilingualText(item)}</td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-950 text-sm">
                      {item.germanText}{' '}
                      {item.notes && (
                        <span className="italic font-normal text-xs text-slate-600">
                          ({item.notes})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>

          {/* Bottomrule */}
          <tfoot>
            <tr className="border-b-2 border-slate-900">
              <td colSpan={2} className="py-3 px-4 text-right text-xs text-slate-500 font-sans italic">
                LexiTeX — Vocabulaire Allemand Généré automatiquement
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
