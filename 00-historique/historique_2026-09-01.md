# Historique des modifications - 01 Septembre 2026

## 1. Mini-Jeu "Matching Pairs" (Course aux Paires)
- **CrÃ©ation du composant autonome** `MatchingPairs.jsx` qui affiche une grille 2 colonnes avec les mots en franÃ§ais Ã  gauche et en allemand Ã  droite.
- **Ajout de la logique de temps** : Un chronomÃ¨tre local de 15 secondes, dissociÃ© du minuteur principal du duel.
- **Retour haptique et sonore (Game Feel)** : 
  - Ajout du son de `playPitchUp` dans `AudioContext.jsx` et `sfxManager.js` pour crÃ©er un effet de crescendo (pitch croissant) Ã  chaque bonne paire reliÃ©e.
  - Ajout des secousses CSS (`shake-hard`) et de la pÃ©nalitÃ© de blocage (2s) en cas d'erreur.
  - Ajout de l'Ã©mission de confettis via `canvas-confetti` en cas de rÃ©ussite.
- **IntÃ©gration dans le flux principal** :
  - Modification de `Game.jsx` pour masquer le clavier virtuel (`VirtualKeyboard`) et la console de saisie (`BattleConsole`) si `question_type === 'matching_pairs'`, et afficher le composant `<MatchingPairs>`.
  - Modification du backend (`GameManager.js` et `index.js`) pour gÃ©nÃ©rer ce mini-jeu avec 50% de chance au lieu d'une question classique.
  - L'Ã©vÃ©nement Socket `submit_matching_pairs` permet de valider le succÃ¨s et d'attribuer un jackpot d'XP (300 XP) au joueur sans bloquer l'adversaire (rÃ©solution en "aveugle").

## 2. Refactoring et Optimisations
- Import correct de la dÃ©pendance existante `canvas-confetti` dans `MatchingPairs.jsx` en remplacement de `react-confetti` (non-prÃ©sente).
- Mise Ã  jour du fichier `MASTER_PRODUCT_TECHNICAL_CONTEXT.md` pour reflÃ©ter l'ajout architectural de cette nouvelle fonctionnalitÃ© dans le point 10.5.

## 3. Intégration du Générateur IA Avancé
- **Intégration Backend** : Remplacement de l'ancien endpoint /api/extract par la version robuste du projet AI list generator utilisant @google/genai (Gemini 3.6 Flash) dans server/index.js. Ajout du support pour les textes, PDF, images et requêtes par thèmes, avec options de filtrage linguistiques (ignorance des prénoms, ajout d'articles, etc.).
- **Création du composant Frontend** : Développement de AIGeneratorView.jsx, une interface premium pour coller du texte ou déposer un fichier multimédia afin d'extraire et traduire du vocabulaire.
- **Intégration Frontend** : Modification de Home.jsx pour intégrer directement AIGeneratorView via le bouton 'Génération IA' qui remplace les anciennes boîtes grisées.
- **Configuration** : Ajout automatique du package @google/genai au serveur et sécurisation de la récupération de la clé via process.env.GEMINI_API_KEY.
