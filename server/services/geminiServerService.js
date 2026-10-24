// Node.js Gemini Flash Service for CROQ/QROC evaluation in multiplayer medical duels
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6InNmt_sD2jtOWtfP5veazlJgMEJ85vNfXf2B6St-_gVw";

const MODEL_CASCADE = [
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];

function cleanLatexMath(str) {
  if (!str || typeof str !== 'string') return '';
  let res = str;
  res = res.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  res = res.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  res = res.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  res = res.replace(/\$([^\$\n]+)\$/g, '$1');
  res = res.replace(/\\(?:mathbf|textbf)\{([^{}]+)\}/g, '$1');
  res = res.replace(/\\(?:text|mathrm|textrm)\{([^{}]*)\}/g, '$1');
  res = res.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  res = res.replace(/\\([a-zA-Z]+)/g, '$1');
  return res.trim();
}

class GeminiServerService {
  constructor() {
    this.apiKey = DEFAULT_GEMINI_KEY;
    this.allowedModels = MODEL_CASCADE;
    this.lastSuccessfulModel = null;
    this.quarantinedModels = new Map();
  }

  setApiKey(key) {
    if (key && key.trim()) {
      this.apiKey = key.trim();
    }
  }

  _isQuarantined(model) {
    if (!this.quarantinedModels.has(model)) return false;
    const expiry = this.quarantinedModels.get(model);
    if (Date.now() > expiry) {
      this.quarantinedModels.delete(model);
      return false;
    }
    return true;
  }

  async callWithFallback(prompt, systemInstruction = '', maxTokens = 1024) {
    const primary = (this.lastSuccessfulModel && !this._isQuarantined(this.lastSuccessfulModel))
      ? this.lastSuccessfulModel
      : this.allowedModels.find(m => !this._isQuarantined(m));

    const candidateModels = primary
      ? [primary, ...this.allowedModels.filter(m => m !== primary)]
      : [...this.allowedModels];

    const errors = [];
    for (const model of candidateModels) {
      if (this._isQuarantined(model)) continue;

      try {
        const result = await this._callModel(model, prompt, systemInstruction, maxTokens);
        if (result && result.text) {
          this.lastSuccessfulModel = model;
          this.quarantinedModels.delete(model);
          return { text: result.text, modelUsed: model };
        }
      } catch (err) {
        errors.push({ model, error: err.message });
        if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
          this.quarantinedModels.set(model, Date.now() + 15 * 60 * 1000);
        } else if (err.message && (err.message.includes('503') || err.message.includes('404'))) {
          this.quarantinedModels.set(model, Date.now() + 5 * 60 * 1000);
        }
      }
    }

    throw new Error(`Tous les modèles Flash ont échoué : ${JSON.stringify(errors)}`);
  }

  async _callModel(model, prompt, systemInstruction, maxTokens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const generationConfig = { temperature: 0.2, maxOutputTokens: maxTokens };

    if (model.includes('gemini-3-flash-preview')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const body = { contents, generationConfig };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (!textPart || !textPart.text) {
      throw new Error('Aucun texte retourné par Gemini');
    }

    return { text: cleanLatexMath(textPart.text.trim()) };
  }

  async evaluateCroq(questionText, clinicalCase, expectedAnswer, userAnswer, timeRemaining = 0) {
    const systemPrompt = `Tu es un professeur expert en pédiatrie et membre du jury de concours de résidanat.
Évalue la réponse d'un étudiant à cette question ouverte courte (CROQ / QROC) médicale par rapport à la réponse officielle attendue.
Critères :
- Tolère les synonymes médicaux, abréviations médicales valides et formulations équivalentes.
- Note de 0 à 100%.
- Si score >= 75%, la réponse est considérée comme juste (isValid: true).
- N'inclus JAMAIS de balises LaTeX.
- Réponds STRICTEMENT au format JSON valide suivant, sans aucun markdown ni texte avant ou après :
{
  "score": 85,
  "isValid": true,
  "feedback": "Explication claire et concise des éléments clés présents et manquants.",
  "reasoningNote": "Conseil méthodologique concours."
}`;

    const userPrompt = `CONTEXTE CLINIQUE : ${clinicalCase || "Aucun"}
QUESTION CROQ : ${questionText}
RÉPONSE MODÈLE OFFICIELLE : ${expectedAnswer}
RÉPONSE ÉTUDIANT : ${userAnswer}

Évalue la réponse et renvoie UNIQUEMENT le JSON.`;

    try {
      const result = await this.callWithFallback(userPrompt, systemPrompt, 1024);
      const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const baseScore = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      const isPerfect = baseScore >= 90;
      const bonus = (isPerfect && timeRemaining > 0) ? Math.floor(timeRemaining * 0.5) : 0;
      const totalScore = baseScore + bonus;

      return {
        score: totalScore,
        baseScore,
        bonus,
        isValid: baseScore >= 75,
        feedback: cleanLatexMath(parsed.feedback || (baseScore >= 75 ? "Bonne réponse conforme aux critères attendus." : "Réponse incomplète ou imprécise.")),
        reasoningNote: cleanLatexMath(parsed.reasoningNote || "Raisonnement clinique analysé."),
        modelUsed: result.modelUsed
      };
    } catch (err) {
      console.warn("[GeminiServerService] Échec Gemini Flash, bascule sur évaluation sémantique locale :", err.message);
      return this.localEvaluateCroq(expectedAnswer, userAnswer, timeRemaining);
    }
  }

  localEvaluateCroq(expectedAnswer, userAnswer, timeRemaining = 0) {
    if (!userAnswer || !userAnswer.trim()) {
      return {
        score: 0,
        baseScore: 0,
        bonus: 0,
        isValid: false,
        feedback: "Aucune réponse saisie.",
        reasoningNote: "Saisissez les mots-clés essentiels de la prise en charge pédiatrique.",
        modelUsed: "Moteur sémantique local"
      };
    }

    const clean = (s) => (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);

    const expWords = clean(expectedAnswer);
    const userWords = clean(userAnswer);

    if (expWords.length === 0) {
      return { score: 100, baseScore: 100, bonus: 0, isValid: true, feedback: "Réponse validée.", reasoningNote: "OK", modelUsed: "Local" };
    }

    const expSet = new Set(expWords);
    let matched = 0;
    for (const w of expSet) {
      if (userWords.some(uw => uw.includes(w) || w.includes(uw))) {
        matched++;
      }
    }

    const ratio = matched / expSet.size;
    const baseScore = Math.min(100, Math.round(ratio * 125)); // un peu de tolérance
    const isPerfect = baseScore >= 90;
    const bonus = (isPerfect && timeRemaining > 0) ? Math.floor(timeRemaining * 0.5) : 0;

    return {
      score: baseScore + bonus,
      baseScore,
      bonus,
      isValid: baseScore >= 75,
      feedback: baseScore >= 75 ? "Mots-clés principaux validés." : "Mots-clés officiels insuffisants.",
      reasoningNote: "Comparé à la réponse de référence concours.",
      modelUsed: "Moteur sémantique local"
    };
  }
}

module.exports = new GeminiServerService();
