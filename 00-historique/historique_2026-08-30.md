# Historique des modifications - 30 Août 2026

### 00:04 - Optimisation Mobile du Sélecteur de Mode et Mise à Jour PWA
- **Adaptation responsive du menu déroulant (`PlayDropdown.jsx`)** :
  - Augmentation du `zIndex` à 9999 pour éviter tout conflit de superposition sur mobile.
  - Ajout des contraintes de largeur adaptative (`minWidth: min(270px, calc(100vw - 32px))`, `maxWidth: min(340px, calc(100vw - 20px))`) afin que le sélecteur des 3 modes (Classique, Survie, Tir à la Corde) soit 100% visible sans débordement sur petit écran.
- **Régénération du bundle de production PWA (`dist/`)** :
  - Nouveau build Vite/PWA (`index-DG7JCdqp.js`) pour forcer l'invalidation du cache Service Worker sur smartphone et tablette.

### 00:27 - Ajustements Visuels & Ergonomie du Mode Tir à la Corde (TugOfWarArena.jsx)
- **Suppression des bandeaux superflus** : Retrait du message supérieur « ⚡ Frappe vite pour tirer le rayon ! » et de son conteneur pour aérer la carte de jeu.
- **Correction du texte de la question (`<h3>`)** : Suppression de l'étirement horizontal excessif, ajustement de la taille de police fluide (`clamp(1.35rem, 3.5vw, 1.85rem)`), du retour à la ligne et limitation de la largeur maximale (`maxWidth: 520px`).
- **Repositionnement des touches d'aide** : Déplacement des 9 boutons d'aide rapide (articles allemands `der`, `die`, `das`, `ein`, `eine` et caractères spéciaux `ä`, `ö`, `ü`, `ß`) **en dessous** du champ de saisie pour une ergonomie naturelle.
- **Régénération du bundle de production Vite/PWA** (`index-DdSVPeOd.js`).

### 00:31 - Activation permanente d'Agentation en développement local
- Modification de la condition d'affichage du composant `<Agentation />` dans `App.jsx` : désormais toujours actif en environnement de développement local (`import.meta.env.DEV || standaloneDebug.isLocalDev`) ainsi que pour le compte administrateur.

### 00:33 - Réorganisation ergonomique des touches d'aide (TugOfWarArena.jsx)
- Suppression du séparateur vertical entre les boutons.
- Répartition des touches d'aide en 2 rangées distinctes : les articles (`der`, `die`, `das`, `ein`, `eine`) sur la première ligne et les caractères spéciaux allemands (`ä`, `ö`, `ü`, `ß`) directement en dessous sur la deuxième ligne.
- Nouveau build de production Vite/PWA (`index-D0-W5Mhh.js`).

### 00:38 - Fix d'ancrage en haut et stabilisation du clavier mobile (TugOfWarArena.jsx & TugOfWarBeam.jsx)
- **Ancrage supérieur fixe** : Passage du conteneur en `minHeight: 100dvh` et `justifyContent: flex-start` avec défilement fluide (`overflow-y: auto`) pour ancrer tout le contenu en haut et empêcher le saut/déplacement quand le clavier virtuel s'ouvre.
- **Réduction compacte de la jauge d'énergie (`TugOfWarBeam.jsx`)** : Hauteur passée à 32px et nœud central à 26px pour économiser l'espace vertical sur smartphone.
- **Carte de jeu compacte** : Réduction des marges, du padding et placeholder court (*« Traduction en allemand... »*) pour que l'ensemble (En-tête + Rayon + Question + Saisie + Boutons) reste 100% visible au-dessus du clavier sans être masqué.
- **Rebuild de production Vite/PWA** (`index-B5EciF0k.js`).
