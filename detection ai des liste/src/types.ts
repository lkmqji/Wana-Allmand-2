export type CategoryKey = 'NOMS' | 'VERBES' | 'ADJECTIFS_ADVERBES' | 'EXPRESSIONS' | string;

export interface VocabItem {
  id: string;
  category: CategoryKey;
  sourceText: string; // Formatted combined string: "Français | English | العربية"
  frenchText?: string; // e.g. "Addition / Facture"
  englishText?: string; // e.g. "Bill / Invoice"
  arabicText?: string; // e.g. "الفاتورة"
  germanText: string; // e.g., "die Rechnung" or "rechnen"
  article?: 'der' | 'die' | 'das' | 'die (pluriel)' | '';
  notes?: string; // e.g., "(pluriel)", "(à l'université)", "(boisson)"
}

export interface ExtractionOptions {
  sourceLang: string; // "Français / English / العربية"
  targetLang: string; // "Allemand"
  excludeProperNouns: boolean; // Exclude person names
  excludeLocations: boolean; // Exclude cities and countries
  excludeBasicGrammar: boolean; // Exclude basic pronouns like "je", "tu"
  includeArticles: boolean; // Add der/die/das for nouns
  includePlurals: boolean; // Add plural for German nouns (e.g. die Rechnung, -en)
  headerColor: string; // e.g., "gray!15", "blue!15", "emerald!15", "purple!15"
  columnWidthSource: string; // e.g., "9cm"
  columnWidthTarget: string; // e.g., "6cm"
  arrayStretch: number; // e.g., 1.3
}

export interface ProcessFileRequest {
  fileBuffer?: string; // Base64 encoded file content
  mimeType?: string; // e.g. "application/pdf", "image/png", "text/plain"
  rawText?: string;
  fileName?: string;
  options?: Partial<ExtractionOptions>;
}

export interface ProcessFileResponse {
  success: boolean;
  vocabulary: VocabItem[];
  latexCode: string;
  summaryStats: {
    totalWords: number;
    nounsCount: number;
    verbsCount: number;
    adjCount: number;
    exprCount: number;
  };
  detectedInfo?: {
    fileName?: string;
    detectedLanguage?: string;
    notes?: string;
  };
  error?: string;
}
