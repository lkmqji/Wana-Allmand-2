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
