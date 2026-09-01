import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, FileType, Sparkles, AlertCircle, File, Volume2, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { ExtractionOptions } from '../types';

interface FileUploadProps {
  onProcessFile: (payload: { fileBuffer?: string; mimeType?: string; rawText?: string; fileName?: string }) => void;
  isLoading: boolean;
  onLoadSample: () => void;
  options: ExtractionOptions;
  onOptionsChange: (opts: ExtractionOptions) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onProcessFile,
  isLoading,
  onLoadSample,
  options,
  onOptionsChange,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    try {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('Le fichier dépasse la limite de 25 MB.');
        return;
      }

      const reader = new FileReader();

      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        reader.readAsText(file);
        reader.onload = () => {
          const rawText = reader.result as string;
          onProcessFile({ rawText, fileName: file.name });
        };
      } else {
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          onProcessFile({
            fileBuffer: base64Data,
            mimeType: file.type || 'application/octet-stream',
            fileName: file.name,
          });
        };
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la lecture du fichier.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    onProcessFile({ rawText: pastedText, fileName: 'Texte copié' });
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 sm:px-10 space-y-12">
      {/* Editorial Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-[#EAE7E1] text-[#4A453E] border border-[#D1CEC7] text-[10px] uppercase font-bold tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span>Extraire Vocabulaire & Noms vers PDF / LaTeX</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif italic font-normal tracking-tight text-[#1A1A1A]">
          Convertissez vos Cours PDF & Photos en Vocabulaire Structuré
        </h2>
        <p className="text-sm text-[#4A453E] leading-relaxed max-w-2xl mx-auto">
          Déposez votre document ou photo. L'application extrait les mots et génère dans la <strong>première colonne les traductions en Français, Anglais et Arabe</strong>, et dans la <strong>deuxième colonne les mots en Allemand</strong> avec leurs articles (<span className="text-[#2563EB] font-bold">der</span>, <span className="text-[#E11D48] font-bold">die</span>, <span className="text-[#059669] font-bold">das</span>).
        </p>
      </div>

      {/* Main Container Card in Editorial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Steps */}
        <aside className="lg:col-span-4 border border-[#E5E1DA] p-8 bg-[#FAF8F5] rounded-sm space-y-8">
          <div>
            <h3 className="text-[11px] uppercase tracking-widest font-black text-[#4A453E] mb-4">
              01. Fichier Source
            </h3>
            <p className="text-xs text-[#8C8273] leading-relaxed">
              Acceptés : <strong className="text-[#1A1A1A]">PDFs, Photos/Scans</strong> (PNG, JPG), documents textes ou enregistrements audio de cours.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-widest font-black text-[#4A453E] mb-4">
              02. Traitement Automatique
            </h3>
            <ul className="space-y-3.5 text-xs">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                <span className="font-serif italic text-[#1A1A1A]">Analyse OCR du PDF ou photo</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                <span className="font-serif italic text-[#1A1A1A]">Extraction des Noms + der/die/das</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                <span className="font-serif italic text-[#1A1A1A]">Filtrage prénoms & villes</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">4</div>
                <span className="font-serif italic text-[#1A1A1A]">Génération du PDF & Code LaTeX</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onLoadSample}
            className="w-full py-3.5 bg-[#FAF8F5] hover:bg-[#EAE7E1] text-[#1A1A1A] border border-[#1A1A1A] text-[10px] uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
            <span>Charger l'Exemple</span>
          </button>
        </aside>

        {/* Right Main Drop Area */}
        <section className="lg:col-span-8 bg-white border border-[#E5E1DA] rounded-sm shadow-sm overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[#E5E1DA] bg-[#FAF8F5] px-6 pt-3 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-3 text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'upload'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#8C8273] hover:text-[#1A1A1A]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Importer Fichier / Photo / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-3 text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 border-b-2 ${
                activeTab === 'paste'
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#8C8273] hover:text-[#1A1A1A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Coller Texte Brut</span>
            </button>
          </div>

          <div className="p-8 flex-1 flex flex-col justify-center">
            {activeTab === 'upload' ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-sm p-10 sm:p-14 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#1A1A1A] bg-[#FAF8F5] scale-[0.99]'
                    : 'border-[#D1CEC7] hover:border-[#1A1A1A] bg-[#FDFCFB] hover:bg-[#FAF8F5]'
                } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx,.csv,.mp3,.wav,.m4a"
                  className="hidden"
                />

                {isLoading ? (
                  <div className="py-8 space-y-4">
                    <div className="w-12 h-12 mx-auto border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#1A1A1A] animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-serif italic text-[#1A1A1A]">
                        Extraction du vocabulaire & Noms en cours...
                      </p>
                      <p className="text-[11px] text-[#8C8273] max-w-md mx-auto uppercase tracking-wider font-semibold">
                        Détection des articles (der/die/das), filtres et génération du PDF
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="w-16 h-16 mx-auto bg-[#FAF8F5] border border-[#E5E1DA] text-[#1A1A1A] flex items-center justify-center rounded-sm">
                      <Upload className="w-7 h-7" />
                    </div>

                    <div>
                      <p className="text-base font-serif italic text-[#1A1A1A]">
                        Glissez votre fichier ici, ou <span className="underline font-sans font-bold text-[#1A1A1A]">parcourez</span>
                      </p>
                      <p className="text-xs text-[#8C8273] mt-2">
                        PDF, Photos de cours (JPG, PNG), Documents textes ou Audio MP3 (Jusqu'à 25 MB)
                      </p>
                    </div>

                    {/* Format Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] uppercase font-bold tracking-wider text-[#4A453E]">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E5E1DA] rounded-sm">
                        <FileType className="w-3.5 h-3.5 text-rose-700" /> PDF Document
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E5E1DA] rounded-sm">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-700" /> Photos & Scans
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E5E1DA] rounded-sm">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" /> Fichiers Texte
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E5E1DA] rounded-sm">
                        <Volume2 className="w-3.5 h-3.5 text-amber-700" /> Audio
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-[#4A453E] mb-2">
                    Texte ou Liste de mots :
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Exemple:&#10;die Rechnung - la facture&#10;der Freund - l'ami&#10;trinken - boire&#10;Haus, Katze, gehen, schnell..."
                    rows={8}
                    className="w-full bg-[#FAF8F5] border border-[#E5E1DA] p-4 text-xs font-mono text-[#1A1A1A] placeholder-[#A39D94] focus:outline-none focus:border-[#1A1A1A] rounded-sm"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="px-4 py-2 text-xs uppercase font-bold text-[#8C8273] hover:text-[#1A1A1A] border border-[#E5E1DA] rounded-sm"
                    disabled={isLoading || !pastedText}
                  >
                    Effacer
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !pastedText.trim()}
                    className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#333333] disabled:opacity-50 text-white text-xs uppercase tracking-[0.2em] font-bold rounded-sm transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lancer l'Extraction</span>
                  </button>
                </div>
              </form>
            )}

            {errorMessage && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-sm flex items-center gap-3 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Bottom Filter Controls */}
          <div className="bg-[#FAF8F5] border-t border-[#E5E1DA] p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#4A453E]">
            <div className="flex flex-wrap items-center gap-5 font-medium">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.excludeProperNouns}
                  onChange={(e) => onOptionsChange({ ...options, excludeProperNouns: e.target.checked })}
                  className="accent-[#1A1A1A] w-4 h-4"
                />
                <span>Exclure prénoms</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.excludeLocations}
                  onChange={(e) => onOptionsChange({ ...options, excludeLocations: e.target.checked })}
                  className="accent-[#1A1A1A] w-4 h-4"
                />
                <span>Exclure villes/pays</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeArticles}
                  onChange={(e) => onOptionsChange({ ...options, includeArticles: e.target.checked })}
                  className="accent-[#1A1A1A] w-4 h-4"
                />
                <span>Articles (der/die/das)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includePlurals !== false}
                  onChange={(e) => onOptionsChange({ ...options, includePlurals: e.target.checked })}
                  className="accent-[#1A1A1A] w-4 h-4"
                />
                <span>Pluriels des noms</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
