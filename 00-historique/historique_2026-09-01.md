# Historique des modifications - 01 Septembre 2026

## 1. Mini-Jeu "Matching Pairs" (Course aux Paires)
- **Cr√©ation du composant autonome** `MatchingPairs.jsx` qui affiche une grille 2 colonnes avec les mots en fran√ßais √† gauche et en allemand √† droite.
- **Ajout de la logique de temps** : Un chronom√®tre local de 15 secondes, dissoci√© du minuteur principal du duel.
- **Retour haptique et sonore (Game Feel)** : 
  - Ajout du son de `playPitchUp` dans `AudioContext.jsx` et `sfxManager.js` pour cr√©er un effet de crescendo (pitch croissant) √† chaque bonne paire reli√©e.
  - Ajout des secousses CSS (`shake-hard`) et de la p√©nalit√© de blocage (2s) en cas d'erreur.
  - Ajout de l'√©mission de confettis via `canvas-confetti` en cas de r√©ussite.
- **Int√©gration dans le flux principal** :
  - Modification de `Game.jsx` pour masquer le clavier virtuel (`VirtualKeyboard`) et la console de saisie (`BattleConsole`) si `question_type === 'matching_pairs'`, et afficher le composant `<MatchingPairs>`.
  - Modification du backend (`GameManager.js` et `index.js`) pour g√©n√©rer ce mini-jeu avec 50% de chance au lieu d'une question classique.
  - L'√©v√©nement Socket `submit_matching_pairs` permet de valider le succ√®s et d'attribuer un jackpot d'XP (300 XP) au joueur sans bloquer l'adversaire (r√©solution en "aveugle").

## 2. Refactoring et Optimisations
- Import correct de la d√©pendance existante `canvas-confetti` dans `MatchingPairs.jsx` en remplacement de `react-confetti` (non-pr√©sente).
- Mise √† jour du fichier `MASTER_PRODUCT_TECHNICAL_CONTEXT.md` pour refl√©ter l'ajout architectural de cette nouvelle fonctionnalit√© dans le point 10.5.

## 3. IntÈgration du GÈnÈrateur IA AvancÈ
- **IntÈgration Backend** : Remplacement de l'ancien endpoint /api/extract par la version robuste du projet AI list generator utilisant @google/genai (Gemini 3.6 Flash) dans server/index.js. Ajout du support pour les textes, PDF, images et requÍtes par thËmes, avec options de filtrage linguistiques (ignorance des prÈnoms, ajout d'articles, etc.).
- **CrÈation du composant Frontend** : DÈveloppement de AIGeneratorView.jsx, une interface premium pour coller du texte ou dÈposer un fichier multimÈdia afin d'extraire et traduire du vocabulaire.
- **IntÈgration Frontend** : Modification de Home.jsx pour intÈgrer directement AIGeneratorView via le bouton 'GÈnÈration IA' qui remplace les anciennes boÓtes grisÈes.
- **Configuration** : Ajout automatique du package @google/genai au serveur et sÈcurisation de la rÈcupÈration de la clÈ via process.env.GEMINI_API_KEY.

## 4. Correction UX Mini-Jeu Course aux Paires
- **Date et Heure :** 2026-09-01 19:54
- Ajout de la disparition (via \isibility: hidden\) des paires correctes tout en conservant leur place dans la grille pour √©viter de briser la mise en page.
- Int√©gration de la prononciation vocale (\speakText\) pour chaque mot allemand correctement trouv√©.
- R√©tablissement de l'animation CSS \shake-hard\ pour produire un tremblement visuel lors d'une erreur d'association.
- Suppression de l'affichage textuel (bloc 'La bonne r√©ponse √©tait') et du TTS de fin de manche si le mode de jeu est 'matching_pairs', ne laissant ainsi appara√Ætre que l'XP gagn√©e.

## 5. Panel Administrateur - Forcer le mode Course aux Paires
- **Date et Heure :** 2026-09-01 20:00
- Ajout d'un bouton (Toggle) dans le Panel Super Admin (onglet *Syst√®me & R√©glages*) permettant de forcer l'apparition du mini-jeu Matching Pairs pour chaque manche (lorsque la liste s'y pr√™te).
- Modification du \GameManager.js\ c√¥t√© serveur pour respecter la configuration \orceMatchingPairs\ stock√©e en BDD.
