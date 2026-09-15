# Historique des modifications - 2026-09-16

### 00:15 - Correction de l'alignement des colonnes du jeu de paires (MatchingPairs) sur mobile portrait
- **Fichier impacté** : `client/src/index.css`
- **Diagnostic** : Sur mobile portrait, deux problèmes affectaient la grille du mini-jeu MatchingPairs. 
  1. La classe `.matching-container` était définie deux fois, avec la seconde occurrence appliquant `align-items: center` ce qui imposait un comportement de type "shrink-to-fit" à la grille et brisait le remplissage à 100%. 
  2. La classe `.matching-grid` utilisait `grid-auto-rows: 1fr`. Bien que cela assure des lignes égales, si un seul mot s'affichait sur 3 ou 4 lignes (sur de petits écrans), *toutes* les autres lignes adoptaient cette hauteur maximale, causant un dépassement de l'écran vertical (overflow vertical) massif, écrasant d'autres éléments.
- **Correction** : 
  - Fusion des déclarations `.matching-container` avec `align-items: stretch`.
  - Suppression de `grid-auto-rows: 1fr` pour `.matching-grid` afin que chaque ligne ne prenne que la hauteur strictement nécessaire (`auto`), le moteur CSS Grid s'occupant d'aligner parfaitement les deux boutons sur le même axe horizontal.
  - Ajout de `min-width: 0` sur `.matching-btn` pour assister le `word-break` et empêcher les textes très longs d'élargir la grille sur certains navigateurs mobiles capricieux (ex: Safari iOS).
- **Vérification** : La mise en page s'adapte désormais de façon robuste même pour des mots longs, tout en gardant l'interface confinée de manière proportionnée dans l'espace disponible (60/40 design pattern). L'alignement est conservé et symétrique en mode multijoueur.

### 00:20 - Correction de la persistance d'état du MatchingPairs (Bug multi-rounds)
- **Fichier impacté** : `client/src/components/Game.jsx`
- **Diagnostic** : Le composant `<MatchingPairs>` ne possédait pas de propriété `key`. Par conséquent, si un joueur tombait sur plusieurs manches de *Matching Pairs* dans la même partie, React recyclait l'instance du composant. Les états internes (comme `matchedIds`, `errorIds`, `timeLeft`, et `isBlocked`) de la manche précédente étaient conservés, ce qui figeait le jeu ou affichait des mots comme déjà "sélectionnés" ou "bloqués" dès le début de la nouvelle manche, donnant l'impression que le bug d'affichage revenait.
- **Correction** : Injection d'une `key` dynamique liée à l'index de la question (`key={\`matching_pairs_${questionIndex}\`}`) pour forcer le démontage complet et la réinitialisation de tous les `useState` à chaque nouvelle manche.

### 00:25 - Désactivation temporaire du mode MatchingPairs
- **Fichier impacté** : `server/game/GameManager.js`
- **Correction** : La probabilité de déclenchement du mini-jeu "Matching Pairs" (Course aux Paires) a été passée de 50% (`0.5`) à 0% (`0.0`). Le mode n'apparaîtra plus aléatoirement lors des sessions de jeu, mais reste activable manuellement depuis le panneau Super Admin (`forceMatchingPairs: true`) pour des tests futurs.
