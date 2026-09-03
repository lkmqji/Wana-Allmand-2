const exampleLists = [
  {
    id: 'ex1',
    title: 'Chapitre 1 : La Maison & les Objets',
    subtitle: '(Haus & Gegenstände)',
    count: '15 mots',
    words: [
      { id: 1, question: 'la table', answer: 'der Tisch' },
      { id: 2, question: 'la chaise', answer: 'der Stuhl' },
      { id: 3, question: 'la maison', answer: 'das Haus' },
      { id: 4, question: 'la porte', answer: 'die Tür' },
      { id: 5, question: 'la fenêtre', answer: 'das Fenster' },
      { id: 6, question: 'le lit', answer: 'das Bett' },
      { id: 7, question: 'l\'armoire', answer: 'der Schrank' },
      { id: 8, question: 'la lampe', answer: 'die Lampe' },
      { id: 9, question: 'la clé', answer: 'der Schlüssel' },
      { id: 10, question: 'le jardin', answer: 'der Garten' },
      { id: 11, question: 'la cuisine', answer: 'die Küche' },
      { id: 12, question: 'le salon', answer: 'das Wohnzimmer' },
      { id: 13, question: 'la salle de bain', answer: 'das Badezimmer' },
      { id: 14, question: 'le mur', answer: 'die Wand' },
      { id: 15, question: 'le toit', answer: 'das Dach' },
    ]
  },
  {
    id: 'ex2',
    title: 'Chapitre 2 : La Nourriture & Boissons',
    subtitle: '(Essen & Trinken)',
    count: '15 mots',
    words: [
      { id: 1, question: 'le pain', answer: 'das Brot' },
      { id: 2, question: 'l\'eau', answer: 'das Wasser' },
      { id: 3, question: 'le fromage', answer: 'der Käse' },
      { id: 4, question: 'la pomme', answer: 'der Apfel' },
      { id: 5, question: 'le café', answer: 'der Kaffee' },
      { id: 6, question: 'le lait', answer: 'die Milch' },
      { id: 7, question: 'le beurre', answer: 'die Butter' },
      { id: 8, question: 'la bière', answer: 'das Bier' },
      { id: 9, question: 'le sel', answer: 'das Salz' },
      { id: 10, question: 'le sucre', answer: 'der Zucker' },
      { id: 11, question: 'la viande', answer: 'das Fleisch' },
      { id: 12, question: 'le poisson', answer: 'der Fisch' },
      { id: 13, question: 'le thé', answer: 'der Tee' },
      { id: 14, question: 'l\'œuf', answer: 'das Ei' },
      { id: 15, question: 'le gâteau', answer: 'der Kuchen' },
    ]
  },
  {
    id: 'ex3',
    title: 'Chapitre 3 : Verbes Essentiels',
    subtitle: '(Wichtige Verben)',
    count: '15 mots',
    words: [
      { id: 1, question: 'être', answer: 'sein' },
      { id: 2, question: 'avoir', answer: 'haben' },
      { id: 3, question: 'faire', answer: 'machen' },
      { id: 4, question: 'aller', answer: 'gehen' },
      { id: 5, question: 'venir', answer: 'kommen' },
      { id: 6, question: 'parler', answer: 'sprechen' },
      { id: 7, question: 'manger', answer: 'essen' },
      { id: 8, question: 'boire', answer: 'trinken' },
      { id: 9, question: 'dormir', answer: 'schlafen' },
      { id: 10, question: 'comprendre', answer: 'verstehen' },
      { id: 11, question: 'voir', answer: 'sehen' },
      { id: 12, question: 'entendre', answer: 'hören' },
      { id: 13, question: 'écrire', answer: 'schreiben' },
      { id: 14, question: 'lire', answer: 'lesen' },
      { id: 15, question: 'apprendre', answer: 'lernen' },
    ]
  },
  {
    id: 'ex4',
    title: 'Chapitre 4 : Ville & Voyage',
    subtitle: '(Stadt & Reise)',
    count: '15 mots',
    words: [
      { id: 1, question: 'la gare', answer: 'der Bahnhof' },
      { id: 2, question: 'le train', answer: 'der Zug' },
      { id: 3, question: 'la rue', answer: 'die Straße' },
      { id: 4, question: 'la voiture', answer: 'das Auto' },
      { id: 5, question: 'le billet', answer: 'die Fahrkarte' },
      { id: 6, question: 'l\'hôtel', answer: 'das Hotel' },
      { id: 7, question: 'la valise', answer: 'der Koffer' },
      { id: 8, question: 'le pont', answer: 'die Brücke' },
      { id: 9, question: 'l\'aéroport', answer: 'der Flughafen' },
      { id: 10, question: 'le passeport', answer: 'der Reisepass' },
      { id: 11, question: 'l\'avion', answer: 'das Flugzeug' },
      { id: 12, question: 'le bus', answer: 'der Bus' },
      { id: 13, question: 'le vélo', answer: 'das Fahrrad' },
      { id: 14, question: 'la place', answer: 'der Platz' },
      { id: 15, question: 'le voyage', answer: 'die Reise' },
    ]
  },
  {
    id: 'ex5',
    title: 'Chapitre 5 : Les Animaux',
    subtitle: '(Die Tiere)',
    count: '15 mots',
    words: [
      { id: 1, question: 'le chien', answer: 'der Hund' },
      { id: 2, question: 'le chat', answer: 'die Katze' },
      { id: 3, question: 'l\'oiseau', answer: 'der Vogel' },
      { id: 4, question: 'le cheval', answer: 'das Pferd' },
      { id: 5, question: 'la vache', answer: 'die Kuh' },
      { id: 6, question: 'la souris', answer: 'die Maus' },
      { id: 7, question: 'le loup', answer: 'der Wolf' },
      { id: 8, question: 'l\'ours', answer: 'der Bär' },
      { id: 9, question: 'le lapin', answer: 'das Kaninchen' },
      { id: 10, question: 'le renard', answer: 'der Fuchs' },
      { id: 11, question: 'le lion', answer: 'der Löwe' },
      { id: 12, question: 'le tigre', answer: 'der Tiger' },
      { id: 13, question: 'le mouton', answer: 'das Schaf' },
      { id: 14, question: 'le cochon', answer: 'das Schwein' },
      { id: 15, question: 'le canard', answer: 'die Ente' },
    ]
  },
  {
    id: 'ex6',
    title: 'Chapitre 6 : Le Corps Humain & Santé',
    subtitle: '(Körper & Gesundheit)',
    count: '15 mots',
    words: [
      { id: 1, question: 'la tête', answer: 'der Kopf' },
      { id: 2, question: 'l\'œil', answer: 'das Auge' },
      { id: 3, question: 'le nez', answer: 'die Nase' },
      { id: 4, question: 'la bouche', answer: 'der Mund' },
      { id: 5, question: 'l\'oreille', answer: 'das Ohr' },
      { id: 6, question: 'le bras', answer: 'der Arm' },
      { id: 7, question: 'la main', answer: 'die Hand' },
      { id: 8, question: 'la jambe', answer: 'das Bein' },
      { id: 9, question: 'le pied', answer: 'der Fuß' },
      { id: 10, question: 'le cœur', answer: 'das Herz' },
      { id: 11, question: 'le médecin', answer: 'der Arzt' },
      { id: 12, question: 'l\'hôpital', answer: 'das Krankenhaus' },
      { id: 13, question: 'le médicament', answer: 'das Medikament' },
      { id: 14, question: 'le dos', answer: 'der Rücken' },
      { id: 15, question: 'le ventre', answer: 'der Bauch' },
    ]
  },
  {
    id: 'ex7',
    title: 'Chapitre 7 : Les Vêtements & Couleurs',
    subtitle: '(Kleidung & Farben)',
    count: '15 mots',
    words: [
      { id: 1, question: 'le pantalon', answer: 'die Hose' },
      { id: 2, question: 'la chemise', answer: 'das Hemd' },
      { id: 3, question: 'la robe', answer: 'das Kleid' },
      { id: 4, question: 'les chaussures', answer: 'die Schuhe' },
      { id: 5, question: 'le manteau', answer: 'der Mantel' },
      { id: 6, question: 'le chapeau', answer: 'der Hut' },
      { id: 7, question: 'rouge', answer: 'rot' },
      { id: 8, question: 'bleu', answer: 'blau' },
      { id: 9, question: 'vert', answer: 'grün' },
      { id: 10, question: 'jaune', answer: 'gelb' },
      { id: 11, question: 'noir', answer: 'schwarz' },
      { id: 12, question: 'blanc', answer: 'weiß' },
      { id: 13, question: 'la veste', answer: 'die Jacke' },
      { id: 14, question: 'la jupe', answer: 'der Rock' },
      { id: 15, question: 'les chaussettes', answer: 'die Socken' },
    ]
  },
  {
    id: 'ex8',
    title: 'Chapitre 8 : École & Travail',
    subtitle: '(Schule & Beruf)',
    count: '15 mots',
    words: [
      { id: 1, question: 'l\'école', answer: 'die Schule' },
      { id: 2, question: 'le livre', answer: 'das Buch' },
      { id: 3, question: 'le stylo', answer: 'der Stift' },
      { id: 4, question: 'le cahier', answer: 'das Heft' },
      { id: 5, question: 'le professeur', answer: 'der Lehrer' },
      { id: 6, question: 'l\'élève', answer: 'der Schüler' },
      { id: 7, question: 'le travail', answer: 'die Arbeit' },
      { id: 8, question: 'le bureau', answer: 'das Büro' },
      { id: 9, question: 'l\'ordinateur', answer: 'der Computer' },
      { id: 10, question: 'la question', answer: 'die Frage' },
      { id: 11, question: 'la réponse', answer: 'die Antwort' },
      { id: 12, question: 'l\'examen', answer: 'die Prüfung' },
      { id: 13, question: 'le patron', answer: 'der Chef' },
      { id: 14, question: 'le salaire', answer: 'das Gehalt' },
      { id: 15, question: 'la réunion', answer: 'das Treffen' },
    ]
  }
];

export const getAllDefaultWords = (additionalLists = []) => {
  const pool = [];
  const seen = new Set();

  const addWord = (w) => {
    if (!w || !w.question || !w.answer) return;
    const key = w.question.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      pool.push({
        id: pool.length + 1,
        question: w.question.trim(),
        answer: w.answer.trim()
      });
    }
  };

  // 1. Add default chapter words
  exampleLists.forEach(list => {
    (list.words || []).forEach(addWord);
  });

  // 2. Add any additional provided lists (public / community / uploaded)
  if (Array.isArray(additionalLists)) {
    additionalLists.forEach(list => {
      (list?.words || []).forEach(addWord);
    });
  }

  return pool;
};

module.exports = { exampleLists };
