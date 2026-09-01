import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { VocabularyTable } from './components/VocabularyTable';
import { LatexViewer } from './components/LatexViewer';
import { PdfPreview } from './components/PdfPreview';
import { OptionsModal } from './components/OptionsModal';
import { SAMPLE_VOCABULARY } from './lib/sampleData';
import { generateLatexCode, DEFAULT_OPTIONS } from './lib/latexGenerator';
import { VocabItem, ExtractionOptions, ProcessFileRequest, ProcessFileResponse } from './types';
import { Sparkles, AlertCircle, RefreshCw, FileText, FileCode, Eye, Upload, Loader2 } from 'lucide-react';

export default function App() {
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [options, setOptions] = useState<ExtractionOptions>(DEFAULT_OPTIONS);
  const [latexCode, setLatexCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'table' | 'latex' | 'preview'>('table');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<{ fileName?: string; notes?: string }>({
    fileName: '',
    notes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewScanClick = () => {
    handleReset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await handleProcessFile({
        fileBuffer: base64,
        mimeType: file.type || 'application/pdf',
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Re-generate LaTeX code whenever vocabulary or layout options change
  useEffect(() => {
    if (vocabulary.length > 0) {
      const generated = generateLatexCode(vocabulary, options);
      setLatexCode(generated);
    } else {
      setLatexCode('');
    }
  }, [vocabulary, options]);

  const handleProcessFile = async (payload: { fileBuffer?: string; mimeType?: string; rawText?: string; fileName?: string }) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const requestData: ProcessFileRequest = {
        ...payload,
        options,
      };

      const res = await fetch('/api/extract-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data: ProcessFileResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'analyse du fichier.');
      }

      setVocabulary(data.vocabulary);
      setLatexCode(data.latexCode);
      if (data.detectedInfo) {
        setDetectedInfo({
          fileName: data.detectedInfo.fileName,
          notes: data.detectedInfo.notes,
        });
      }
      setActiveTab('table');
    } catch (err: any) {
      console.error('Error in handleProcessFile:', err);
      setErrorMessage(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItems = (newItems: VocabItem[]) => {
    setVocabulary(newItems);
  };

  const handleCopyLatex = () => {
    if (!latexCode) return;
    navigator.clipboard.writeText(latexCode);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 3000);
  };

  const handleDownloadTex = () => {
    if (!latexCode) return;
    const blob = new Blob([latexCode], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tableau_vocabulaire_allemand.tex';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setVocabulary(SAMPLE_VOCABULARY);
    setDetectedInfo({
      fileName: 'Vocabulaire_Exemple.pdf',
      notes: '60+ mots pré-enregistrés avec articles der/die/das et infinitifs.',
    });
    setActiveTab('table');
  };

  const handleReset = () => {
    setVocabulary([]);
    setLatexCode('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalWords={vocabulary.length}
        onCopyLatex={handleCopyLatex}
        copiedLatex={copiedLatex}
        onDownloadTex={handleDownloadTex}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {errorMessage && (
          <div className="max-w-4xl mx-auto mt-6 px-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-900 font-bold px-2 py-1"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* View Selection Bar for Mobile or Top State */}
        {vocabulary.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Document : {detectedInfo.fileName || 'Fichier d\'origine'}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      {vocabulary.length} mots extraits
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{detectedInfo.notes}</p>
                </div>
              </div>

              {/* Nouveau Scan & Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/*,.png,.jpg,.jpeg,.txt"
                  className="hidden"
                />
                <button
                  onClick={handleNewScanClick}
                  disabled={isLoading}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Scanner ou importer un nouveau document"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-100" />
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-100" />
                  )}
                  <span>Nouveau scan</span>
                </button>

                {/* Mobile Tab Switcher */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl flex-1 sm:flex-none justify-center">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'table'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Vocabulaire</span>
                </button>
                <button
                  onClick={() => setActiveTab('latex')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'latex'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Code LaTeX</span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Rendu PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Tab Views */}
        {vocabulary.length === 0 ? (
          <FileUpload
            onProcessFile={handleProcessFile}
            isLoading={isLoading}
            onLoadSample={handleLoadSample}
            options={options}
            onOptionsChange={setOptions}
          />
        ) : (
          <>
            {activeTab === 'table' && (
              <VocabularyTable
                items={vocabulary}
                onUpdateItems={handleUpdateItems}
                onGoToLatex={() => setActiveTab('latex')}
              />
            )}

            {activeTab === 'latex' && (
              <LatexViewer
                latexCode={latexCode}
                onCopyLatex={handleCopyLatex}
                copiedLatex={copiedLatex}
                onDownloadTex={handleDownloadTex}
                options={options}
                onOptionsChange={setOptions}
                onRequeryLatex={() => {
                  const regen = generateLatexCode(vocabulary, options);
                  setLatexCode(regen);
                }}
              />
            )}

            {activeTab === 'preview' && (
              <PdfPreview
                items={vocabulary}
                options={options}
                onDownloadTex={handleDownloadTex}
              />
            )}

            {/* Re-upload Dropzone Section at bottom when viewing data */}
            <div className="max-w-6xl mx-auto px-4 mt-12">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Analyser un autre document ?</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Glissez-déposez un nouveau fichier PDF, image de cours ou enregistrement pour remplacer ou fusionner le vocabulaire.
                </p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Déposer un nouveau fichier</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Options & Filter Modal */}
      <OptionsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onOptionsChange={setOptions}
      />
    </div>
  );
}
