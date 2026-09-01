import React from 'react';
import { X, Sliders, Check, Settings, ShieldCheck, Palette, FileText } from 'lucide-react';
import { ExtractionOptions } from '../types';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ExtractionOptions;
  onOptionsChange: (opts: ExtractionOptions) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Options d'Extraction & LaTeX</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Section: Filtering Rules */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Règles de Filtrage du Vocabulaire (Étape 1)</span>
            </h4>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Exclure les noms propres & prénoms</div>
                  <div className="text-[11px] text-slate-500">Ex: Lisa, Anna, Max, John</div>
                </div>
                <input
                  type="checkbox"
                  checked={options.excludeProperNouns}
                  onChange={(e) => onOptionsChange({ ...options, excludeProperNouns: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Exclure les villes et pays</div>
                  <div className="text-[11px] text-slate-500">Ex: Paris, London, Tokyo, Deutschland</div>
                </div>
                <input
                  type="checkbox"
                  checked={options.excludeLocations}
                  onChange={(e) => onOptionsChange({ ...options, excludeLocations: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Exclure les mots de grammaire basiques</div>
                  <div className="text-[11px] text-slate-500">Ex: pronoms isolés "je", "tu", "il"</div>
                </div>
                <input
                  type="checkbox"
                  checked={options.excludeBasicGrammar}
                  onChange={(e) => onOptionsChange({ ...options, excludeBasicGrammar: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Inclure les articles définis (der/die/das)</div>
                  <div className="text-[11px] text-slate-500">Obligatoire pour apprendre le genre des noms</div>
                </div>
                <input
                  type="checkbox"
                  checked={options.includeArticles}
                  onChange={(e) => onOptionsChange({ ...options, includeArticles: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Inclure le pluriel des noms allemands</div>
                  <div className="text-[11px] text-slate-500">Ex: die Rechnung, -en / das Buch, -¨er</div>
                </div>
                <input
                  type="checkbox"
                  checked={options.includePlurals !== false}
                  onChange={(e) => onOptionsChange({ ...options, includePlurals: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </div>
          </div>

          {/* Section: Language Pair */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Langues du Tableau</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Langue Source</label>
                <select
                  value={options.sourceLang}
                  onChange={(e) => onOptionsChange({ ...options, sourceLang: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium"
                >
                  <option value="Français / English / العربية">Français / English / العربية (Trilingue)</option>
                  <option value="Français">Français</option>
                  <option value="Anglais">Anglais</option>
                  <option value="Espagnol">Espagnol</option>
                  <option value="Italien">Italien</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Langue Cible</label>
                <select
                  value={options.targetLang}
                  onChange={(e) => onOptionsChange({ ...options, targetLang: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium"
                >
                  <option value="Allemand">Allemand</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: LaTeX Styling */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Mise en page LaTeX (Étape 2)</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Couleur d'en-tête</label>
                <select
                  value={options.headerColor}
                  onChange={(e) => onOptionsChange({ ...options, headerColor: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-mono"
                >
                  <option value="gray!15">gray!15 (Standard)</option>
                  <option value="blue!15">blue!15 (Bleu)</option>
                  <option value="emerald!15">emerald!15 (Vert)</option>
                  <option value="amber!15">amber!15 (Ambre)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Espacement \arraystretch</label>
                <input
                  type="number"
                  step="0.1"
                  value={options.arrayStretch}
                  onChange={(e) => onOptionsChange({ ...options, arrayStretch: parseFloat(e.target.value) || 1.3 })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer & Fermer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
