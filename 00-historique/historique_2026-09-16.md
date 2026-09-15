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
