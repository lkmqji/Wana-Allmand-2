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

### 00:51 - Optimisation des performances Frontend (Vite 8 & PWA)
- **Code Splitting granulaire (`vite.config.js`)** :
  - Découpage du bundle principal via `manualChunks` en modules indépendants : `vendor-react` (React, React-DOM, React-Router), `vendor-firebase` (Firebase Auth/App), `vendor-socket` (Socket.io), `vendor-confetti` (Canvas-Confetti) et `vendor-agentation`.
  - Élimination du fichier monolithique de 1,17 Mo au profit de chunks ciblés et parallélisés.
- **Préchargement et Mise en Cache PWA (`VitePWA` / Workbox)** :
  - Extension des `globPatterns` et de `includeAssets` pour inclure et pré-cacher les assets statiques, effets sonores (SFX / audio `.mp3`, `.wav`) et polices.
  - Augmentation de `maximumFileSizeToCacheInBytes` (15 Mo) pour garantir la mise en cache complète des sons et musiques dès l'installation du Service Worker.
  - Ajout de règles de cache d'exécution (`runtimeCaching`) dédiées pour les polices Google Fonts (`Outfit`, `Syne`, `JetBrains Mono`) avec stratégies `StaleWhileRevalidate` et `CacheFirst`.
- **Minification & Compression Build** :
  - Activation de la minification native optimisée Vite 8, `cssMinify: true`, `cssCodeSplit: true` et désactivation des sourcemaps de production.
  - Régénération réussie du build de production.

### 00:52 - Masquage de l'espace administrateur pour les non-administrateurs (`Profil.jsx`)
- **Restriction d'accès et d'affichage** :
  - La boîte « Mode Administrateur » / « Espace Administrateur » dans l'onglet Profil est désormais strictement conditionnée à `user && isAdmin`.
  - Les utilisateurs standards (non administrateurs) ne voient plus du tout cet encadré ni le bouton pour basculer en mode admin.
  - Les administrateurs authentifiés conservent l'accès complet à leur espace et aux contrôles associés.

### 01:46 - Suppression de l'icône du conteneur dans le modal d'accueil (`OnboardingTour.jsx`)
- **Nettoyage visuel du modal de bienvenue** :
  - Suppression du conteneur d'icône rebondissant (`onboarding-icon-wrapper`) au-dessus des titres d'étapes pour épurer l'affichage et rendre le modal plus compact et clair.

### 02:05 - Ajout des routes Keep-Alive & Health Check pour Render (`server/index.js`)
- **Routes légères de maintien en éveil** :
  - Ajout des routes `GET /`, `GET /health` et `GET /api/health` qui retournent immédiatement un statut `200 OK` avec le temps d'activité (`uptime`) et l'horodatage.
  - Permet d'éviter le "Cold Start" sur Render.com via un service de ping périodique externe (ex: cron-job.org) sans solliciter la base de données MongoDB.

### 02:26 - Optimisation SEO & Performance Web du fichier racine (`client/index.html`)
- **Implémentation des balises Resource Hints (`preconnect` et `dns-prefetch`)** :
  - *Google Fonts* : Pré-résolution DNS et pré-connexion TLS avec `crossorigin` pour `fonts.googleapis.com` et `fonts.gstatic.com` afin d'éliminer le blocage du rendu lié au téléchargement des polices.
  - *Backend Render (API & WebSockets)* : Anticipation de la connexion TCP/TLS et résolution DNS pour les serveurs Render (`wana-allmand.onrender.com` et `onrender.com`).
  - *Firebase Authentication & Services Google* : Optimisation des requêtes d'authentification et des jetons d'accès via `identitytoolkit.googleapis.com`, `securetoken.googleapis.com` et `wana-allmand.firebaseapp.com`.
- **Désactivation du délai de 300ms au tap sur Safari iOS** :
  - Configuration de la balise `<meta name="viewport">` avec `maximum-scale=1.0, user-scalable=no, viewport-fit=cover` pour supprimer le délai natif de 300ms du "double-tap-to-zoom" et rendre les boutons 100% réactifs.

### 02:44 - Consolidation et mise à jour du Master Technical Context (`MASTER_PRODUCT_TECHNICAL_CONTEXT.md`)
- **Synthèse exhaustive des modifications du 29 août 2026** :
  - Rédaction et intégration de la section dédiée récapitulant les optimisations majeures (Frontend Snappy UI & suppression des fuites mémoires, Claviers d'aide allemands virtuels, Résilience réseau & déconnexion immédiate, Diagnostics backend & indexation MongoDB, Nouveau mode de jeu Tir à la Corde et Intégration Agentation).
  - Mise à jour cohérente des sections d'architecture, des modes de gameplay et de l'arborescence des composants.
### 15:35 - Intégration de Capacitor pour la compilation en APK Android
- **Installation et initialisation de Capacitor** :
  - Ajout des dépendances `@capacitor/core`, `@capacitor/cli` et `@capacitor/android` au projet `client`.
  - Création du fichier de configuration `capacitor.config.json` liant le build web (`dist`) au conteneur natif Android.
  - Ajout et synchronisation de la plateforme Android (`npx cap add android`).

### 16:05 - Restauration des dépendances de compilation Gradle
- **Correction du build Android Studio** :
  - Restauration des packages `@capacitor/android/capacitor` dans `node_modules` indispensables à la résolution des sous-projets Gradle par Android Studio.

### 16:17 - Mode Plein Écran Immersif & Autorisation Réseau
- **Plein écran immersif (Suppression barre d'état et navigation)** :
  - Modification de `MainActivity.java` avec `WindowInsetsControllerCompat` pour masquer automatiquement la barre de batterie, l'heure et la barre de navigation système.
- **Autorisation réseau HTTP/HTTPS** :
  - Ajout de `android:usesCleartextTraffic="true"` dans `AndroidManifest.xml`.

### 16:22 - Connexion au Serveur Backend distant Render
- **Configuration réseau de production** :
  - Configuration de l'URL `https://serveur-allemand.onrender.com` dans `client/.env` et comme fallback direct dans `App.jsx`.
  - Rebuild complet de l'application web (`npm run build`) et synchronisation avec le dossier natif Android (`npx cap sync android`).

### 16:24 - Documentation & Sauvegarde de l'Environnement
- **Création des fichiers de référence dans `00-historique/`** :
  - Création de `ENV_CONFIG.md` et `.env` détaillant les variables de production (Render, Firebase, MongoDB).

### 16:32 - Ajout du script de synchronisation automatique Android
- **Facilitation du workflow** :
  - Ajout de la commande `npm run sync:android` dans `client/package.json` permettant de compiler et synchroniser automatiquement les modifications web vers le projet Android.

### 17:00 - Résolution de l'erreur de chemin relatif Gradle dans Android Studio
- **Correction des paramètres globaux Android Studio (`gradle.settings.xml`)** :
  - Suppression de la valeur invalide `serviceDirectoryPath="i"` dans la configuration globale d'Android Studio qui provoquait l'erreur `Cannot convert relative path i\daemon\8.14.3 to an absolute file`.

### 17:58 - Fix Global de la Version Portable (Capacitor Android)
- **Authentification Native Google Auth** : Remplacement de `signInWithPopup`/`signInWithRedirect` par le plugin `@codetrix-studio/capacitor-google-auth` pour Capacitor afin de résoudre les problèmes de connexion au compte Google dans le WebView Android. (Nécessite de renseigner le Web Client ID dans `firebase.js` et dans `android/app/src/main/res/values/strings.xml`).
- **Prononciation (Text-To-Speech)** : Intégration du plugin `@capacitor-community/text-to-speech` avec un nouveau module `utils/speech.js`. Il bascule automatiquement sur le TTS natif Capacitor (sans bug de mute) sur mobile et conserve `window.speechSynthesis` sur le web (`Game.jsx`, `VengeanceMode.jsx`).
- **StatusBar & Bouton Retour Android** : Intégration des plugins `@capacitor/status-bar` (pour afficher la barre noire en haut de l'écran avec heure visible) et `@capacitor/app` (pour intercepter le bouton retour matériel `hardwareBackPress` et gérer la navigation : retour accueil, quitter l'app ou menu pause).
- **Correctif d'affichage Agentation** : Modification de la logique `evaluateStandalone` dans `App.jsx`. L'accès au panneau de retour visuel Agentation est désormais bloqué pour tous les utilisateurs sur téléphone natif Capacitor (`window.Capacitor.isNative`), et réservé uniquement à l'Admin authentifié.

### 18:03 - Finalisation Google Auth Mobile
- **Injection du Web Client ID** : Renseignement du `VITE_GOOGLE_CLIENT_ID` dans le fichier `.env` et intégration en dur dans le fichier natif `strings.xml` pour l'authentification Capacitor Android.

### 18:08 - Intégration du Logo App
- **Logo App** : Intégration du nouveau logo (logo.jpg) en remplacement de l'ancien favicon et icône PWA (avicon.svg) dans index.html, manifest.webmanifest, ite.config.js et InstallGate.jsx.
