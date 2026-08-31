## 2026-08-31 01:50 - Implémentation du WanaBoard et Fake Input

- Création du composant `VirtualKeyboard.jsx` (WanaBoard) avec support QWERTY/AZERTY, haptique, et touches spéciales allemandes.
- Modification de `BattleConsole.jsx` : Remplacement du champ natif par un 'Fake Input' autonome pour éviter les cascades de re-rendus de Game.jsx et bloquer l'ouverture du clavier mobile natif.
- Ajout de la 'Smart Logic' d'auto-capitalisation (der, die, das + Majuscule) dans `BattleConsole`.
- Mise à jour de `index.css` pour structurer l'écran mobile en 60% haut / 40% bas et fixer l'écran (`overflow: hidden`).
- Intégration du composant `VirtualKeyboard` dans `Game.jsx`, `VengeanceMode.jsx`, et `TugOfWarArena.jsx`.
