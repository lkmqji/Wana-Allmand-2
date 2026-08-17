export const exampleLists = [
  {
    id: 'ex1',
    title: 'Chapitre 1 : La Maison & les Objets',
    subtitle: '(Haus & Gegenstände)',
    count: '10 mots',
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
    ]
  },
  {
    id: 'ex2',
    title: 'Chapitre 2 : La Nourriture & Boissons',
    subtitle: '(Essen & Trinken)',
    count: '10 mots',
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
    ]
  },
  {
    id: 'ex3',
    title: 'Chapitre 3 : Verbes Essentiels',
    subtitle: '(Wichtige Verben)',
    count: '10 mots',
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
    ]
  },
  {
    id: 'ex4',
    title: 'Chapitre 4 : Ville & Voyage',
    subtitle: '(Stadt & Reise)',
    count: '10 mots',
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
    ]
  },
  {
    id: 'ex5',
    title: 'Chapitre 5 : Les Animaux',
    subtitle: '(Die Tiere)',
    count: '10 mots',
    words: [
      { id: 1, question: 'le chien', answer: 'der Hund' },
      { id: 2, question: 'le chat', answer: 'die Katze' },
      { id: 3, question: 'l\'oiseau', answer: 'der Vogel' },
      { id: 4, question: 'le cheval', answer: 'das Pferd' },
      { id: 5, question: 'le poisson', answer: 'der Fisch' },
      { id: 6, question: 'la souris', answer: 'die Maus' },
      { id: 7, question: 'le loup', answer: 'der Wolf' },
      { id: 8, question: 'l\'ours', answer: 'der Bär' },
      { id: 9, question: 'le lapin', answer: 'das Kaninchen' },
      { id: 10, question: 'le renard', answer: 'der Fuchs' },
    ]
  }
];

export const getAllDefaultWords = () => {
  const pool = [];
  exampleLists.forEach(list => {
    list.words.forEach(w => {
      if (!pool.some(p => p.question.toLowerCase() === w.question.toLowerCase())) {
        pool.push({ ...w });
      }
    });
  });
  return pool;
};
