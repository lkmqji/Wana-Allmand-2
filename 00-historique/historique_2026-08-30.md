# Historique des modifications - 30 Août 2026

### 00:04 - Optimisation Mobile du Sélecteur de Mode et Mise à Jour PWA
- **Adaptation responsive du menu déroulant (`PlayDropdown.jsx`)** :
  - Augmentation du `zIndex` à 9999 pour éviter tout conflit de superposition sur mobile.
  - Ajout des contraintes de largeur adaptative (`minWidth: min(270px, calc(100vw - 32px))`, `maxWidth: min(340px, calc(100vw - 20px))`) afin que le sélecteur des 3 modes (Classique, Survie, Tir à la Corde) soit 100% visible sans débordement sur petit écran.
- **Régénération du bundle de production PWA (`dist/`)** :
  - Nouveau build Vite/PWA (`index-DG7JCdqp.js`) pour forcer l'invalidation du cache Service Worker sur smartphone et tablette.
