import React, { useState, useMemo } from 'react';
import { VocabItem, CategoryKey } from '../types';
import { Search, Plus, Trash2, Edit3, Save, X, BookOpen, ArrowRight, Languages, Check } from 'lucide-react';

interface VocabularyTableProps {
  items: VocabItem[];
  onUpdateItems: (newItems: VocabItem[]) => void;
  onGoToLatex: () => void;
}

export const VocabularyTable: React.FC<VocabularyTableProps> = ({
  items,
  onUpdateItems,
  onGoToLatex,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VocabItem>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [newItemForm, setNewItemForm] = useState<{
    category: CategoryKey;
    frenchText: string;
    englishText: string;
    arabicText: string;
    germanText: string;
    article: string;
  }>({
    category: 'NOMS',
    frenchText: '',
    englishText: '',
    arabicText: '',
    germanText: '',
    article: 'die',
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const nouns = items.filter((i) => i.category === 'NOMS').length;
    const verbs = items.filter((i) => i.category === 'VERBES').length;
    const adjs = items.filter((i) => i.category === 'ADJECTIFS_ADVERBES').length;
    const exprs = items.filter((i) => i.category === 'EXPRESSIONS' || i.category === 'EXPRESSIONS_UTILES').length;
    return { nouns, verbs, adjs, exprs, total: items.length };
  }, [items]);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat =
        activeCategory === 'ALL' ||
        item.category === activeCategory ||
        (activeCategory === 'EXPRESSIONS' && item.category === 'EXPRESSIONS_UTILES');

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.sourceText.toLowerCase().includes(q) ||
        (item.frenchText && item.frenchText.toLowerCase().includes(q)) ||
        (item.englishText && item.englishText.toLowerCase().includes(q)) ||
        (item.arabicText && item.arabicText.toLowerCase().includes(q)) ||
        item.germanText.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  const handleStartEdit = (item: VocabItem) => {
    setEditingId(item.id);
    const parts = item.sourceText.split(/\s*\|\s*/);
    setEditForm({
      ...item,
      frenchText: item.frenchText || parts[0] || item.sourceText,
      englishText: item.englishText || parts[1] || '',
      arabicText: item.arabicText || parts[2] || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = items.map((item) => {
      if (item.id === editingId) {
        const fr = editForm.frenchText?.trim() || '';
        const en = editForm.englishText?.trim() || '';
        const ar = editForm.arabicText?.trim() || '';
        const combined = [fr, en, ar].filter(Boolean).join(' | ');

        return {
          ...item,
          ...editForm,
          frenchText: fr,
          englishText: en,
          arabicText: ar,
          sourceText: combined || editForm.sourceText || '',
        } as VocabItem;
      }
      return item;
    });
    onUpdateItems(updated);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    onUpdateItems(items.filter((i) => i.id !== id));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.germanText) return;

    const fr = newItemForm.frenchText.trim();
    const en = newItemForm.englishText.trim();
    const ar = newItemForm.arabicText.trim();
    const combined = [fr, en, ar].filter(Boolean).join(' | ');

    const newItem: VocabItem = {
      id: `manual-${Date.now()}`,
      category: newItemForm.category || 'NOMS',
      frenchText: fr,
      englishText: en,
      arabicText: ar,
      sourceText: combined || fr || 'Nouveau mot',
      germanText: newItemForm.germanText.trim(),
      article: newItemForm.article as any,
    };

    onUpdateItems([...items, newItem]);
    setIsAdding(false);
    setNewItemForm({
      category: 'NOMS',
      frenchText: '',
      englishText: '',
      arabicText: '',
      germanText: '',
      article: 'die',
    });
  };

  const getArticleBadge = (article?: string, germanText?: string) => {
    let art = article;
    if (!art && germanText) {
      if (/^der\b/i.test(germanText)) art = 'der';
      else if (/^die\b/i.test(germanText)) art = 'die';
      else if (/^das\b/i.test(germanText)) art = 'das';
    }

    if (!art) return null;

    if (art === 'der') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold font-mono">
          der
        </span>
      );
    }
    if (art === 'die') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold font-mono">
          die
        </span>
      );
    }
    if (art === 'das') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
          das
        </span>
      );
    }
    if (art.includes('pluriel') || art.includes('pl')) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold font-mono">
          die (pl.)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono">
        {art}
      </span>
    );
  };

  const renderTrilingualSource = (item: VocabItem) => {
    const parts = item.sourceText ? item.sourceText.split(/\s*\|\s*/) : [];
    const fr = item.frenchText || parts[0] || item.sourceText;
    const en = item.englishText || parts[1] || '';
    const ar = item.arabicText || parts[2] || '';

    return (
      <div className="space-y-1 my-0.5">
        {fr && (
          <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              FR
            </span>
            <span>{fr}</span>
          </div>
        )}
        {en && (
          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              EN
            </span>
            <span>{en}</span>
          </div>
        )}
        {ar && (
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-sans">
              AR
            </span>
            <span className="font-serif tracking-wide">{ar}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Category Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeCategory === 'ALL'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="text-xs opacity-80 font-medium">Tous les mots</div>
          <div className="text-xl font-bold mt-0.5">{stats.total}</div>
        </button>

        <button
          onClick={() => setActiveCategory('NOMS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeCategory === 'NOMS'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="text-xs opacity-80 font-medium">NOMS</div>
          <div className="text-xl font-bold mt-0.5">{stats.nouns}</div>
        </button>

        <button
          onClick={() => setActiveCategory('VERBES')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeCategory === 'VERBES'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="text-xs opacity-80 font-medium">VERBES</div>
          <div className="text-xl font-bold mt-0.5">{stats.verbs}</div>
        </button>

        <button
          onClick={() => setActiveCategory('ADJECTIFS_ADVERBES')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeCategory === 'ADJECTIFS_ADVERBES'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="text-xs opacity-80 font-medium">ADJECTIFS & ADV</div>
          <div className="text-xl font-bold mt-0.5">{stats.adjs}</div>
        </button>

        <button
          onClick={() => setActiveCategory('EXPRESSIONS')}
          className={`p-3.5 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
            activeCategory === 'EXPRESSIONS'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="text-xs opacity-80 font-medium">EXPRESSIONS</div>
          <div className="text-xl font-bold mt-0.5">{stats.exprs}</div>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (Français / English / العربية / Allemand)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un mot (Trilingue)</span>
            </button>

            <button
              onClick={onGoToLatex}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Voir le Code LaTeX</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Word Form Popup */}
        {isAdding && (
          <form
            onSubmit={handleAddItem}
            className="p-5 bg-indigo-50/90 border-b border-indigo-200 space-y-4"
          >
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Languages className="w-4 h-4 text-indigo-600" />
              <span>Ajouter une nouvelle entrée trilingue</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white"
                >
                  <option value="NOMS">NOMS (Substantive)</option>
                  <option value="VERBES">VERBES (Verben)</option>
                  <option value="ADJECTIFS_ADVERBES">ADJECTIFS & ADVERBES</option>
                  <option value="EXPRESSIONS">EXPRESSIONS UTILES</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">🇫🇷 Français</label>
                <input
                  type="text"
                  placeholder="ex: Addition / Facture"
                  value={newItemForm.frenchText}
                  onChange={(e) => setNewItemForm({ ...newItemForm, frenchText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">🇬🇧 English</label>
                <input
                  type="text"
                  placeholder="ex: Bill / Invoice"
                  value={newItemForm.englishText}
                  onChange={(e) => setNewItemForm({ ...newItemForm, englishText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">🇸🇦 العربية</label>
                <input
                  type="text"
                  placeholder="ex: الفاتورة"
                  value={newItemForm.arabicText}
                  onChange={(e) => setNewItemForm({ ...newItemForm, arabicText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  🇩🇪 Allemand (2ème colonne avec article / infinitif)
                </label>
                <input
                  type="text"
                  placeholder="ex: die Rechnung"
                  value={newItemForm.germanText}
                  onChange={(e) => setNewItemForm({ ...newItemForm, germanText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer mot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Vocabulary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 w-32">Catégorie</th>
                <th className="py-3.5 px-4 w-1/2">
                  <div className="flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-indigo-600" />
                    <span>Colonne 1 : Français / English / العربية</span>
                  </div>
                </th>
                <th className="py-3.5 px-4">
                  <span>Colonne 2 : Allemand (avec article/infinitif)</span>
                </th>
                <th className="py-3.5 px-4 w-28 text-center">Article</th>
                <th className="py-3.5 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600">Aucun mot trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery ? "Essayez une autre recherche." : "Déposez un fichier ou ajoutez un mot."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-indigo-50/50">
                        <td className="py-2 px-4">
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                            className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                          >
                            <option value="NOMS">NOMS</option>
                            <option value="VERBES">VERBES</option>
                            <option value="ADJECTIFS_ADVERBES">ADJECTIFS & ADV</option>
                            <option value="EXPRESSIONS">EXPRESSIONS</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-blue-600 font-bold">FR:</span>
                            <input
                              type="text"
                              value={editForm.frenchText || ''}
                              onChange={(e) => setEditForm({ ...editForm, frenchText: e.target.value })}
                              placeholder="Français"
                              className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-amber-600 font-bold">EN:</span>
                            <input
                              type="text"
                              value={editForm.englishText || ''}
                              onChange={(e) => setEditForm({ ...editForm, englishText: e.target.value })}
                              placeholder="English"
                              className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-emerald-600 font-bold">AR:</span>
                            <input
                              type="text"
                              value={editForm.arabicText || ''}
                              onChange={(e) => setEditForm({ ...editForm, arabicText: e.target.value })}
                              placeholder="العربية"
                              className="w-full border border-slate-300 rounded p-1 text-xs bg-white font-serif"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editForm.germanText || ''}
                            onChange={(e) => setEditForm({ ...editForm, germanText: e.target.value })}
                            className="w-full border border-slate-300 rounded p-1 text-xs bg-white font-bold"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <select
                            value={editForm.article || ''}
                            onChange={(e) => setEditForm({ ...editForm, article: e.target.value as any })}
                            className="border border-slate-300 rounded p-1 text-xs bg-white"
                          >
                            <option value="">-- Aucun --</option>
                            <option value="der">der (m)</option>
                            <option value="die">die (f)</option>
                            <option value="das">das (n)</option>
                            <option value="die (pluriel)">die (pl.)</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                              title="Enregistrer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-500">
                        {item.category === 'NOMS' && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">NOMS</span>}
                        {item.category === 'VERBES' && <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">VERBES</span>}
                        {item.category === 'ADJECTIFS_ADVERBES' && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">ADJ & ADV</span>}
                        {(item.category === 'EXPRESSIONS' || item.category === 'EXPRESSIONS_UTILES') && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">EXPR</span>}
                      </td>
                      <td className="py-3 px-4">
                        {renderTrilingualSource(item)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-950 text-sm tracking-wide">
                        {item.germanText}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getArticleBadge(item.article, item.germanText)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="p-3.5 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredItems.length} mots affichés sur {items.length} au total</span>
          <span className="font-mono">Format Trilingue : Français / English / العربية &rarr; Allemand</span>
        </div>
      </div>
    </div>
  );
};
