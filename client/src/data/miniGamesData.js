/**
 * Datasets pour les nouveaux mini-jeux :
 * 1. Lückentext (Textes à trous)
 * 2. Conjugaison (Verben Level Up)
 * 3. Quiz Visuel (Devine l'image avec illustrations SVG et emojis)
 */

export const LUCKENTEXT_LIST = [
  {
    id: 1,
    question: "Ich trinke jeden Morgen ___ (le) Kaffee.",
    contextSentence: "Ich trinke jeden Morgen ___ Kaffee.",
    hint: "Accusatif masculin (der Kaffee -> ?)",
    answer: "den",
    fullSentence: "Ich trinke jeden Morgen den Kaffee."
  },
  {
    id: 2,
    question: "Sie geht heute in ___ (le) Kino.",
    contextSentence: "Sie geht heute in ___ Kino.",
    hint: "Accusatif neutre (in + das = ?)",
    answer: "das",
    fullSentence: "Sie geht heute in das Kino."
  },
  {
    id: 3,
    question: "Der Arzt hilft ___ (au) Patienten.",
    contextSentence: "Der Arzt hilft ___ Patienten.",
    hint: "Datif masculin (helfen + Datif)",
    answer: "dem",
    fullSentence: "Der Arzt hilft dem Patienten."
  },
  {
    id: 4,
    question: "Wir wohnen seit zwei Jahren in ___ (la) Stadt.",
    contextSentence: "Wir wohnen seit zwei Jahren in ___ Stadt.",
    hint: "Datif féminin (in der Stadt)",
    answer: "der",
    fullSentence: "Wir wohnen seit zwei Jahren in der Stadt."
  },
  {
    id: 5,
    question: "Er kauft ein Geschenk für ___ (sa) Mutter.",
    contextSentence: "Er kauft ein Geschenk für ___ Mutter.",
    hint: "Accusatif féminin (für + seine)",
    answer: "seine",
    fullSentence: "Er kauft ein Geschenk für seine Mutter."
  }
];

export const CONJUGATION_LIST = [
  {
    id: 1,
    question: "sein (il est / er ...)",
    infinitive: "sein",
    tense: "Présent (er/sie/es)",
    answer: "ist"
  },
  {
    id: 2,
    question: "haben (vous avez / ihr ...)",
    infinitive: "haben",
    tense: "Présent (ihr)",
    answer: "habt"
  },
  {
    id: 3,
    question: "gehen (il est allé / Participe Passé)",
    infinitive: "gehen",
    tense: "Partizip II (ist ...)",
    answer: "gegangen"
  },
  {
    id: 4,
    question: "sehen (tu vois / du ...)",
    infinitive: "sehen",
    tense: "Présent (du - verbe fort)",
    answer: "siehst"
  },
  {
    id: 5,
    question: "sprechen (il parla / Prétérit)",
    infinitive: "sprechen",
    tense: "Präteritum (er)",
    answer: "sprach"
  },
  {
    id: 6,
    question: "essen (il mange / er ...)",
    infinitive: "essen",
    tense: "Présent (er - verbe fort)",
    answer: "isst"
  }
];

export const VISUAL_QUIZ_LIST = [
  {
    id: 1,
    question: "🍎 Que représente cette image ?",
    visualIcon: "🍎",
    hint: "Fruit rouge croquant (masculin)",
    answer: "der Apfel"
  },
  {
    id: 2,
    question: "🚗 Que représente cette image ?",
    visualIcon: "🚗",
    hint: "Véhicule à 4 roues (neutre)",
    answer: "das Auto"
  },
  {
    id: 3,
    question: "🏠 Que représente cette image ?",
    visualIcon: "🏠",
    hint: "Bâtiment où l'on vit (neutre)",
    answer: "das Haus"
  },
  {
    id: 4,
    question: "🩺 Que représente cette image ?",
    visualIcon: "🩺",
    hint: "Instrument médical pour écouter le cœur (neutre)",
    answer: "das Stethoskop"
  },
  {
    id: 5,
    question: "🐱 Que représente cette image ?",
    visualIcon: "🐱",
    hint: "Animal de compagnie qui miaule (féminin)",
    answer: "die Katze"
  },
  {
    id: 6,
    question: "📖 Que représente cette image ?",
    visualIcon: "📖",
    hint: "Objet avec des pages à lire (neutre)",
    answer: "das Buch"
  }
];
