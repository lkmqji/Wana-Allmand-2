# Historique des modifications - 01 Septembre 2026

## 1. Mini-Jeu "Matching Pairs" (Course aux Paires)
- **Création du composant autonome** `MatchingPairs.jsx` qui affiche une grille 2 colonnes avec les mots en français à gauche et en allemand à droite.
- **Ajout de la logique de temps** : Un chronomètre local de 15 secondes, dissocié du minuteur principal du duel.
- **Retour haptique et sonore (Game Feel)** : 
  - Ajout du son de `playPitchUp` dans `AudioContext.jsx` et `sfxManager.js` pour créer un effet de crescendo (pitch croissant) à chaque bonne paire reliée.
  - Ajout des secousses CSS (`shake-hard`) et de la pénalité de blocage (2s) en cas d'erreur.
  - Ajout de l'émission de confettis via `canvas-confetti` en cas de réussite.
- **Intégration dans le flux principal** :
  - Modification de `Game.jsx` pour masquer le clavier virtuel (`VirtualKeyboard`) et la console de saisie (`BattleConsole`) si `question_type === 'matching_pairs'`, et afficher le composant `<MatchingPairs>`.
  - Modification du backend (`GameManager.js` et `index.js`) pour générer ce mini-jeu avec 50% de chance au lieu d'une question classique.
  - L'événement Socket `submit_matching_pairs` permet de valider le succès et d'attribuer un jackpot d'XP (300 XP) au joueur sans bloquer l'adversaire (résolution en "aveugle").

## 2. Refactoring et Optimisations
- Import correct de la dépendance existante `canvas-confetti` dans `MatchingPairs.jsx` en remplacement de `react-confetti` (non-présente).
- Mise à jour du fichier `MASTER_PRODUCT_TECHNICAL_CONTEXT.md` pour refléter l'ajout architectural de cette nouvelle fonctionnalité dans le point 10.5.
