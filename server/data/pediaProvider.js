const fs = require('fs');
const path = require('path');

class PediaProvider {
  constructor() {
    this.chapters = [];
    this.questions = [];
    this.questionsByChapter = new Map();
    this.isLoaded = false;
  }

  loadData() {
    if (this.isLoaded) return true;

    try {
      const basePath = path.resolve(__dirname, '../../qcm-p-diatrie/src/data');
      const chaptersPath = path.join(basePath, 'chapters.js');
      const questionsPath = path.join(basePath, 'questions.js');

      if (!fs.existsSync(chaptersPath) || !fs.existsSync(questionsPath)) {
        console.warn(`[PediaProvider] Fichiers introuvables dans ${basePath}`);
        return false;
      }

      // Load Chapters
      const chaptersRaw = fs.readFileSync(chaptersPath, 'utf8');
      const chaptersJson = chaptersRaw
        .replace(/^window\.PEDIA_CHAPTERS\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim();
      this.chapters = JSON.parse(chaptersJson);

      // Load Questions
      const questionsRaw = fs.readFileSync(questionsPath, 'utf8');
      const questionsJson = questionsRaw
        .replace(/^window\.PEDIA_QUESTIONS\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .trim();
      this.questions = JSON.parse(questionsJson);

      // Index by chapter
      this.questionsByChapter.clear();
      for (const q of this.questions) {
        const cId = q.chapterId || 'autres';
        if (!this.questionsByChapter.has(cId)) {
          this.questionsByChapter.set(cId, []);
        }
        this.questionsByChapter.get(cId).push(q);
      }

      this.isLoaded = true;
      console.log(`[PediaProvider] Données chargées avec succès : ${this.chapters.length} chapitres, ${this.questions.length} questions.`);
      return true;
    } catch (err) {
      console.error('[PediaProvider] Erreur lors du chargement des données pédiatriques :', err.message);
      return false;
    }
  }

  getChapters() {
    this.loadData();
    const totalQuestions = this.questions.length;
    const totalCroq = this.questions.filter(q => q.is_croq || q.type === 'CROQ').length;

    const allOption = {
      id: 'all',
      title: 'Tous les cours (Mélange aléatoire)',
      count: totalQuestions,
      croqCount: totalCroq
    };

    return [allOption, ...this.chapters];
  }

  getQuestions({ chapterId = 'all', count = 10, questionType = 'all' } = {}) {
    this.loadData();

    let pool = [];
    if (!chapterId || chapterId === 'all') {
      pool = [...this.questions];
    } else {
      pool = [...(this.questionsByChapter.get(chapterId) || [])];
    }

    // Filter by question type
    if (questionType === 'qcm') {
      pool = pool.filter(q => !q.is_croq && q.type !== 'CROQ');
    } else if (questionType === 'croq') {
      pool = pool.filter(q => q.is_croq || q.type === 'CROQ');
    }

    if (pool.length === 0) {
      // Fallback si filtre trop strict
      pool = [...this.questions];
    }

    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedCount = Math.max(1, Math.min(count || 10, shuffled.length));
    return shuffled.slice(0, selectedCount);
  }

  /**
   * Safe live question payload (hides solutions to prevent browser cheating during the round)
   */
  prepareLiveQuestion(q) {
    if (!q) return null;
    const isCroq = !!(q.is_croq || q.type === 'CROQ');

    const liveOptions = (q.options || []).map(opt => ({
      id: opt.id,
      letter: opt.letter,
      text: opt.text
    }));

    return {
      uid: q.uid || String(q.id),
      id: q.id,
      chapterId: q.chapterId,
      chapterTitle: q.chapterTitle,
      type: q.type || (isCroq ? 'CROQ' : 'QCM'),
      is_croq: isCroq,
      is_cas_clinique: !!q.is_cas_clinique,
      clinical_case: q.clinical_case || null,
      question: q.question,
      options: liveOptions,
      media_urls: q.media_urls || []
    };
  }

  /**
   * Complete question payload revealed during the 60s debrief / inter-round review phase
   */
  prepareDebriefQuestion(q) {
    if (!q) return null;
    return {
      ...q,
      is_croq: !!(q.is_croq || q.type === 'CROQ'),
      correctLetters: (q.options || []).filter(o => o.is_correct).map(o => o.letter.toUpperCase()).sort()
    };
  }
}

module.exports = new PediaProvider();
