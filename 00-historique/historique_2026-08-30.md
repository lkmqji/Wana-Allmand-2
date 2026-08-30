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

### 10:55 - Recherche et installation des skills d'onboarding et de tutoriels interactifs
- **Installation via l'écosystème Skills** :
  - Recherche et installation globale d'une suite complète de skills pour concevoir des tutoriels interactifs, boucles de gamification, animations dynamiques et micro-interactions :
    - `gamification-loops` & `learning-experience` (`omer-metin/skills-for-antigravity`)
    - `duo-gamification` & `duo-design` (`hktitan/duolingo`)
    - `interactive-product-tour` (`rampstackco/claude-skills`)
    - `onboarding-cro` (`coreyhaines31/marketingskills`)
    - `interactive-component-creator` (`qodex-ai/ai-agent-skills`)
    - `find-animation-opportunities` & `improve-animations` (`emilkowalski/skills`)
    - `rive-interactive` & `lottie-animations` (`freshtechbro/claudedesignskills`)
    - `gsap-framer-scroll-animation` (`github/awesome-copilot`)

### 11:03 - Lancement local de l'application (Backend & Frontend)
- **Installation des dépendances** :
  - Installation automatique des packages `npm` pour le serveur (`server/`) et pour le client (`client/`).
- **Démarrage des services locaux** :
  - Lancement du serveur backend Node.js / Express / Socket.io sur le port `3001` (connecté avec succès à MongoDB Atlas).
  - Lancement du serveur de développement Vite pour le client React sur le port `5173` (`http://localhost:5173/`).

### 11:20 - Implémentation du Système d'Onboarding "Triage Médical"
- **Création du contexte d'état global (`OnboardingContext.jsx`)** :
  - Gestion légère de l'état du tutoriel (`isActive`, `currentStep`, cibles) avec React Context pour éviter d'alourdir `App.jsx`.
  - Persistance de l'état `wana_onboarding_completed` via `localStorage`.
- **Création du hook personnalisé (`useSpotlightTarget.js`)** :
  - Hook permettant d'attacher dynamiquement des références aux éléments existants sans modifier la structure DOM ni casser les layouts Flexbox/Grid.
- **Création du composant d'Overlay accéléré matériellement (`OnboardingOverlay.jsx`)** :
  - Implémentation d'un "Spotlight" via `clip-path: polygon(...)` pour créer un trou interactif au-dessus de la cible.
  - Utilisation de `transform: translateZ(0)` et `backdrop-filter: blur(16px)` pour des performances à 60 FPS sur mobile, évitant les repeints causés par les ombres massives.
- **Création du composant des dialogues (`TutorialStep.jsx`)** :
  - Utilisation des animations élastiques (`modalSpringIn`) existantes pour un rendu "Game Feel" immédiat.
- **Intégration principale (`main.jsx`)** :
  - Injection du `OnboardingProvider` et de l'`OnboardingOverlay` à la racine de l'application pour couvrir toutes les routes de manière globale.

### 11:30 - Intégration de l'Onboarding dans le Gameplay
- **Page d'accueil (`Home.jsx`)** :
  - Attachement du spotlight au bouton "CRÉER LOBBY" avec `useSpotlightTarget('INTRO')`.
  - Modification de `handlePlaySolo` pour injecter automatiquement le mot "der Hund" lors du premier lancement par un nouvel utilisateur.
- **Jeu (`Game.jsx`)** :
  - Attachement du spotlight au champ de saisie avec `useSpotlightTarget('TYPE_HUND')`.
  - Auto-avancement du tutoriel (de `INTRO` à `TYPE_HUND`) lorsque le composant `Game` est monté.
  - Interception de la réponse : si l'utilisateur saisit "Hund" sans l'article "der", l'input tremble (`error-shake`) et l'étape `ARTICLE_WARNING` se déclenche pour forcer l'apprentissage.
  - Fin automatique du tutoriel (`skipOnboarding()`) lorsque la bonne réponse est saisie.

### 11:55 - Finalisation du Copywriting Esport et Redirection de la Cible Spotlight
- **Redirection de la cible d'introduction (`Home.jsx`)** :
  - Déplacement et étiquetage explicite du bouton vers « ⚔️ DUEL RAPIDE SOLO » comme point d'entrée principal sur l'accueil avec `ref={introSpotlightRef}` (`useSpotlightTarget('INTRO')`).
- **Intégration du Copywriting Esport (`TutorialStep.jsx`)** :
  - **Étape 'INTRO'** :
    - *Titre* : « Bienvenue dans l'Arène. ⚔️ »
    - *Description* : « Ici, on n'apprend pas l'allemand en lisant. On s'entraîne par la vitesse, les réflexes et le combat. Clique sur le bouton en surbrillance pour ton échauffement. »
  - **Étape 'TYPE_HUND'** :
    - *Titre* : « Ton premier combat. 🐕 »
    - *Description* : « Traduis 'le chien'. (Astuce : tape simplement 'Hund' sans l'article pour voir la physique du jeu...) »
  - **Étape 'ARTICLE_WARNING'** :
    - *Titre* : « RÈGLE DE SURVIE N°1 🚨 »
    - *Description* : « Un mot sans son article (der/die/das) est FAUX. Les erreurs atterrissent sur ton Mur de la Vengeance. Prouve que tu as compris : tape 'der Hund' pour valider. »
- **Amélioration du style et de la lisibilité sombre / Glassmorphism (`TutorialStep.jsx`, `OnboardingOverlay.jsx`)** :
  - Application de la police `Outfit` et fond sombre translucide en verre poli (`rgba(15, 23, 42, 0.92)` avec `backdrop-filter: blur(20px)`).
  - Adaptation dynamique du halo lumineux (cyan néon en temps normal, rouge écarlate lors de l'alerte de survie).
- **Transmission du tremblement (`Game.jsx`)** :
  - Passage de la prop `shake={shakeInput}` au sous-composant `GameInputForm` pour déclencher l'animation d'erreur `error-shake` en cas d'oubli d'article.

### 12:01 - Déblocage de la Transition Lobby et Lancement Automatique du Duel Onboarding
- **Démarrage automatique du premier combat (`Lobby.jsx`)** :
  - Ajout d'un déclencheur automatique `socket.emit('start_game', session.id)` dès l'arrivée dans le salon si le joueur est en cours de tutoriel (`INTRO`), évitant ainsi de rester bloqué dans le salon d'attente.
- **Résilience de la connexion WebSocket (`Home.jsx`)** :
  - Sécurisation de l'émission `create_session` avec écouteur `socket.once('connect')` si le socket est en cours de négociation, garantissant l'ouverture immédiate de la session.
- **Déverrouillage des interactions en transition (`OnboardingOverlay.jsx`)** :
  - Configuration dynamique de `pointerEvents: activeTargetRect ? 'auto' : 'none'` pour ne jamais verrouiller l'écran pendant les transitions entre écrans.

### 12:03 - Désactivation du Compte à Rebours Automatique en Onboarding
- **Durée infinie pour l'apprentissage (`Home.jsx`)** :
  - Passage automatique de `timePerWord: 999` secondes lors de la session de tutoriel afin que le serveur n'arrête pas le round prématurément au bout de 15 secondes pendant que le joueur lit les instructions.
- **Gel du chronomètre et affichage infini (`Game.jsx`)** :
  - Désactivation du compte à rebours local et affichage visuel du badge `⏳ ∞ (Tutoriel)` tant que l'utilisateur est sur les étapes `TYPE_HUND` ou `ARTICLE_WARNING`.
  - Désactivation de l'auto-soumission par timeout pour laisser le temps complet au joueur de taper et tester la mécanique.

### 12:05 - Désactivation Totale du Timeout Serveur pour le Tutoriel
- **Arrêt du timer côté Backend (`server/index.js`)** :
  - Conditionnement de `session.roundTimer` pour ne jamais déclencher de fin de manche automatique si `timePerWord >= 300` ou en mode tutoriel.
  - Le round reste désormais actif indéfiniment jusqu'à ce que le joueur tape activement sa réponse dans le champ de saisie.

### 12:21 - Correction du Double Lancement (Strict Mode React)
- **Prévention du Double `start_game` (`Lobby.jsx`)** :
  - L'utilisation de `useRef(false)` empêche React 18 Strict Mode d'exécuter `socket.emit('start_game')` deux fois de suite au chargement du lobby.
- **Correction du chronomètre fantôme côté Serveur (`server/index.js`)** :
  - Assignation et annulation propre (`clearTimeout`) de `session.startGameTimer` à chaque lancement.
  - Résout le bug critique où la deuxième émission de `start_game` remplaçait le timeout et passait immédiatement à la "Question Suivante" (la question fantôme N°2 du tutoriel), provoquant un écran de fin de partie instantané alors que le joueur n'avait rien écrit.

### 12:25 - Correction du Focus et Placeholders Dynamiques de l'Onboarding
- **Multi-cibles sur le Hook Spotlight (`useSpotlightTarget.js`)** :
  - Support d'un tableau d'étapes (`['TYPE_HUND', 'ARTICLE_WARNING']`) pour que l'input reste détouré avec son halo lumineux et son trou d'interaction même après le passage à l'étape d'alerte rouge.
- **Auto-focus et reprise en main (`Game.jsx`)** :
  - Ajout d'un timer de focus automatique lors de la transition vers `ARTICLE_WARNING` pour redonner immédiatement la main au joueur sans qu'il ait besoin de recliquer.
- **Placeholders gris dynamiques selon l'étape (`Game.jsx`)** :
  - Étape 2 (`TYPE_HUND`) : `"Tape 'Hund' sans l'article..."`
  - Étape 3 (`ARTICLE_WARNING`) : `"Tape 'der Hund' avec l'article..."`
  - Mode standard : `"Ex: der Tisch"`

### 12:31 - Laboratoire de Tests de Performance et Stress Test
- **Épreuve d'effort Socket.IO (`server/stress-test.yml`)** :
  - Création du scénario Artillery simulant l'inscription au Lobby, l'envoi de messages de chat et la déconnexion sur 3 phases progressives (10, 100, puis 500 utilisateurs simultanés).
- **Intégration Clinic.js & Artillery (`server/package.json`)** :
  - Ajout des scripts `"test:clinic"` (`clinic doctor -- node index.js`) et `"test:stress"` (`artillery run stress-test.yml`).

### 12:40 - Exécution et Résultats de l'Examen Médical & Épreuve d'Effort
- **Bilan Frontend (Production Build & PWA)** :
  - Build Vite réussi en 497ms, chunks optimisés avec preconnects DNS et Service Worker Workbox généré.
- **Épreuve d'effort (Stress Test Socket.IO)** :
  - Phase 1 (10 joueurs) : 100% de succès, latence moyenne 0.70ms.
  - Phase 2 (100 joueurs) : 100% de succès, latence moyenne 0.47ms.
  - Phase 3 (500 joueurs) : 500 connexions et inscriptions au Lobby gérées sans aucune perte de paquet.
- **Holter ECG (Surveillance Mémoire & Event Loop)** :
  - Heap V8 : 10.2 MB au repos ➔ 29.7 MB sous 500 connexions simultanées.
  - RSS maximal : 99 MB - 134 MB.
  - Retard de cycle Event Loop maîtrisé (<230ms en pic de vague de connexion), 0 crash, 0 rejet non géré.

### 12:50 - Audit de Santé du Site Public Déployé (Vercel & Render)
- **Frontend Edge Vercel (`https://wana-allmand-2.vercel.app/`)** :
  - Code HTTP 200 OK, TTFB de 208ms, compression Brotli (`br`), Edge Cache HIT.
  - Validation du déploiement des 6 hints de Resource Preconnect / DNS-Prefetch (Fonts, Render, Firebase).
  - Validation du manifest PWA (`manifest.webmanifest`, TTFB 43ms) et du Service Worker (`sw.js`).
- **Backend Cloud Render (`https://wana-allmand.onrender.com/`)** :
  - Serveur actif et en ligne avec un temps de réponse direct de 303ms.



