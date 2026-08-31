# Historique des modifications - 31 Août 2026

### 17:58 - Fix Global de la Version Portable (Capacitor Android)
- **Authentification Native Google Auth** : Remplacement de `signInWithPopup`/`signInWithRedirect` par le plugin `@codetrix-studio/capacitor-google-auth` pour Capacitor afin de résoudre les problèmes de connexion au compte Google dans le WebView Android. (Nécessite de renseigner le Web Client ID dans `firebase.js` et dans `android/app/src/main/res/values/strings.xml`).
- **Prononciation (Text-To-Speech)** : Intégration du plugin `@capacitor-community/text-to-speech` avec un nouveau module `utils/speech.js`. Il bascule automatiquement sur le TTS natif Capacitor (sans bug de mute) sur mobile et conserve `window.speechSynthesis` sur le web (`Game.jsx`, `VengeanceMode.jsx`).
- **StatusBar & Bouton Retour Android** : Intégration des plugins `@capacitor/status-bar` (pour afficher la barre noire en haut de l'écran avec heure visible) et `@capacitor/app` (pour intercepter le bouton retour matériel `hardwareBackPress` et gérer la navigation : retour accueil, quitter l'app ou menu pause).
- **Correctif d'affichage Agentation** : Modification de la logique `evaluateStandalone` dans `App.jsx`. L'accès au panneau de retour visuel Agentation est désormais bloqué pour tous les utilisateurs sur téléphone natif Capacitor (`window.Capacitor.isNative`), et réservé uniquement à l'Admin authentifié.

### 18:03 - Finalisation Google Auth Mobile
- **Injection du Web Client ID** : Renseignement du `VITE_GOOGLE_CLIENT_ID` dans le fichier `.env` et intégration en dur dans le fichier natif `strings.xml` pour l'authentification Capacitor Android.

### 18:08 - Intégration du Logo App
- **Logo App** : Intégration du nouveau logo (logo.jpg) en remplacement de l'ancien favicon et icône PWA (favicon.svg) dans index.html, manifest.webmanifest, vite.config.js et InstallGate.jsx.

### 00:36 - Unification de la Console de Saisie
- **Création du composant BattleConsole** : Abstraction de l'input et du clavier d'aide dans un composant partagé (BattleConsole.jsx) avec gestion native des articles et caractères spéciaux.
- **Mise à jour des Modes** : Remplacement des formulaires de saisie en dur par <BattleConsole /> dans Game.jsx, VengeanceMode.jsx et TugOfWarArena.jsx.
- **Standardisation UI** : Uniformisation de l'icône de validation (➔), de la taille de police de la question et du design du bouton de soumission.

### 00:48 - Fix Déploiement Vercel
- **Conflit de dépendances NPM** : Ajout du fichier `.npmrc` avec `legacy-peer-deps=true` dans le dossier client pour forcer l'installation sur Vercel malgré les avertissements de version de `@capacitor/core`.

### 15:58 - Fix Disposition Clavier Mobile
- **Correction Layout Portrait** : Forçage de la disposition 50/50 stricte (50dvh) entre la zone principale contenant la console de saisie (moitié supérieure) et le clavier virtuel (moitié inférieure) sur les écrans mobiles avec désactivation du défilement.

### 01:15 - Uniformisation des trois modes de jeu
- Uniformisation des trois modes de jeu (Standard, Vengeance, Tir à la Corde) en utilisant le composant Wrapper central `BattleCard`.
- Intégration de `BattleCard` dans `Game.jsx`, extraction du scoreboard dans le `specialRuleSlot`.
- Intégration de `BattleCard` dans `VengeanceMode.jsx`, déplacement de la jauge de cœurs et du chronomètre.
- Intégration de `BattleCard` dans `TugOfWarArena.jsx` pour encapsuler la console de saisie tout en gardant l'animation cohérente.
- Amélioration de `BattleCard` pour avoir un `flex: 1` et s'adapter proprement au parent sans forcer un `100vh` rigide.

### 01:50 - Implémentation du WanaBoard et Fake Input
- Création du composant `VirtualKeyboard.jsx` (WanaBoard) avec support QWERTY/AZERTY, haptique, et touches spéciales allemandes.
- Modification de `BattleConsole.jsx` : Remplacement du champ natif par un 'Fake Input' autonome pour éviter les cascades de re-rendus de Game.jsx et bloquer l'ouverture du clavier mobile natif.
- Ajout de la 'Smart Logic' d'auto-capitalisation (der, die, das + Majuscule) dans `BattleConsole`.
- Mise à jour de `index.css` pour structurer l'écran mobile en 60% haut / 40% bas et fixer l'écran (`overflow: hidden`).
- Intégration du composant `VirtualKeyboard` dans `Game.jsx`, `VengeanceMode.jsx`, et `TugOfWarArena.jsx`.

### 16:03 - Standardisation du Format d'Historique et Nettoyage
- **Règle de nommage d'historique** : Création du fichier `.agents/rules/historique.md` imposant le format strict `historique_YYYY-MM-DD.md`.
- **Nettoyage 00-historique** : Fusion des fichiers doublons du 31/08/2026 (`2026-08-31.md`, `2026-08-31-wanaboard.md`) dans le fichier unique `historique_2026-08-31.md` et suppression des doublons.

### 16:24 - Ajustement Disposition WanaBoard
- **Affichage Permanent** : Ajout d'un `useEffect` dans `VirtualKeyboard.jsx` pour appliquer la classe `.mobile-keyboard-active` dès le montage du composant (et non plus uniquement au clic sur l'input). Cela garantit que la disposition 50/50 stricte (Battle Console 50% haut, WanaBoard 50% bas) est *toujours* appliquée de manière cohérente dès l'entrée dans un mode de jeu sur mobile.

### 16:41 - Nettoyage des options obsolètes
- **Suppression du réglage de taille du clavier** : L'interface permettant aux utilisateurs de modifier la taille du clavier virtuel (slider de 30% à 65%) a été retirée de la page Profil (`Profil.jsx`), et la logique d'initialisation de cette variable css (`--kb-height`) dans `App.jsx` a été supprimée puisque la disposition est désormais fixée strictement à 50% (`50dvh`).

### 17:15 - Refonte de l'Architecture Mobile 60/40 (WanaBoard)
- **Architecture 60/40** : L'écran mobile est désormais strictement verrouillé en mode portrait via `manifest.webmanifest`. L'arène prend précisément 60% de l'écran et le clavier WanaBoard 40%, empêchant tout chevauchement ou disparition du champ de saisie (`.mobile-keyboard-active`).
- **Anti-écrasement Dynamique** : Intégration de `font-size: clamp()` sur le `.fake-input` pour s'assurer que les mots allemands particulièrement longs s'adaptent et ne brisent pas la grille.
- **Ergonomie du Clavier (VirtualKeyboard)** :
  - Ligne supérieure scindée en deux : articles (`der`, `die`, `das`) séparés des caractères spéciaux (`ä`, `ö`, `ü`, `ß`).
  - Implémentation des couleurs sémantiques obligatoires : Entrée (`vert`), Effacer (`rouge`), Espace (`gris foncé`).
  - Animation `translateY(4px)` pure (Game Feel mécanique 3D) au clic, sans changement de couleur.
- **Comportement Menu/Chat** : Écoute de l'événement `wana_menu_toggle` par le clavier pour injecter dynamiquement la classe `.keyboard-hidden`, provoquant un glissement GPU (translateY(100%)) du clavier vers le bas et une expansion de la Carte de Jeu sur 100% de l'écran avec une transition fluide.

### 17:26 - Correction d'une régression UI sur le Layout et la Pause
- **Correction du Layout Vengeance/Tir à la corde** : Modification de la structure Flexbox du conteneur principal de `BattleCard` dans les modes `VengeanceMode` et `TugOfWarArena` (`justify-content: space-evenly; height: 100%; overflow: hidden;`) pour garantir que l'input ne déborde pas des 60% supérieurs de l'écran, peu importe les éléments au-dessus.
- **Gestion du Clavier Virtuel pendant la Pause** : Ajout d'une prop `isHidden` au composant `VirtualKeyboard`. Propagée avec l'état `isPaused` dans `Game.jsx` et `matchStatus === 'PAUSED'` dans `TugOfWarArena.jsx`. Si le Menu de pause est ouvert, le clavier 40% prend dynamiquement la classe `.keyboard-hidden` (`transform: translateY(100%)`) et la carte de jeu occupe l'espace libéré.

### 17:35 - Fix Définitif du Chevauchement 60/40 (MinHeight)
- **Ajustement des conteneurs racines** : Suppression du `min-height: 100vh` en dur sur `.vengeance-arena` (dans `index.css`) et du `minHeight: 100dvh` sur `TugOfWarArena.jsx`.
- Remplacement par `height: 100%; flex: 1; overflow: hidden;` afin d'autoriser ces conteneurs à rétrécir à `60dvh` lorsque `.mobile-keyboard-active` est actif. Ceci empêche définitivement le clavier de venir écraser ou recouvrir le champ de saisie par le bas.

### 17:44 - Amélioration du Game Feel du WanaBoard
- **Son & Haptique** : Ajout du retour sonore (`sfx.playClick()`) en plus de la vibration haptique existante à chaque appui sur une touche du clavier virtuel (`VirtualKeyboard.jsx`) pour un meilleur feedback utilisateur.

### 18:03 - Synchronisation Web vers Android (Capacitor Sync)
- **Transplantation (Build & Sync)** : Compilation du projet Web (`vite build`) et synchronisation de l'arborescence compilée vers l'environnement natif Android (`cap sync android`).
- **Intégrité Mobile** : L'injection a mis à jour le dossier `android/app/src/main/assets/public/` avec les nouveautés du jour (WanaBoard, BattleConsole) tout en préservant scrupuleusement l'anatomie mobile (`build.gradle`, `AndroidManifest.xml` et les paramètres d'UI natifs).
