# MASTER PRODUCT & TECHNICAL CONTEXT — WANA ALLMAND

> **Document de Référence pour l'Architecture, le Game Design et l'Ingénierie Logicielle.**  
> Destiné aux développeurs et agents d'ingénierie logicielle intervenant sur la plateforme **Wana Allmand**.

---

## 1. PRODUCT VISION & UX

### 1.1 Objectif & Proposition de Valeur
**Wana Allmand** est une application web progressive (**PWA**) EdTech gamifiée et hautement compétitive, conçue pour maîtriser le vocabulaire et la grammaire allemande (articles de genre *der/die/das*, déclinaisons, orthographe stricte, trémas et *Eszett* `ß`).  
À la croisée d'un outil d'apprentissage ultra-pédagogique et d'un jeu multijoueur temps réel (type *Quiz Arena* / *Brawl Stars*), elle élimine la passivité de l'apprentissage traditionnel grâce à la pression du chronomètre, aux classements en direct, aux duels multijoueurs synchronisés, aux affrontements dynamiques en duel de rayon (**Tir à la Corde**) et au système de rattrapage punitif mais gratifiant : le **Mur de la Vengeance**.

### 1.2 Modes de Jeu & Core Loop
La plateforme s'articule autour de 4 piliers de gameplay :

```
[ 1. LOBBY & SÉLECTION ] ➔ [ 2. DUEL CLASSIQUE | SURVIE | TIR À LA CORDE ] ➔ [ 3. RÉSULTATS & VENGEANCE ]
          ▲                                                                               │
          └───────────────────────────── (Purification des erreurs) ──────────────────────┘
```

1. **Duel Classique (Multijoueur / Solo)** :
   - Séquence de questions chronométrées (~15s par manche).
   - Saisie exacte de la traduction allemande avec son article de genre.
   - Système de score pondéré par la rapidité et la distance de Levenshtein.
2. **Mode Survie (Contre-la-montre infini)** :
   - Chronomètre court (~10.5s) avec pénalités de temps en cas d'erreur.
   - Enchaînement jusqu'à épuisement du temps pour établir un record d'XP.
3. **Mode Tir à la Corde (Tug of War / Rayon Énergétique)** :
   - Duel dynamique en face-à-face (contre un joueur ou l'IA bot `Valkyrie-AI`).
   - Jauge d'énergie visuelle centrale (Cyan vs Cramoisi) avec singularité d'impact.
   - Chaque bonne réponse pousse le rayon vers le camp adverse ; combo et vitesse déterminent la force de poussée jusqu'à la rupture victorieuse.
   - Moteur de particules Canvas 60fps (`ParticleBurst`) et animations de chute de lettres erronées (`TypoFallingVFX`).
4. **Mur de la Vengeance (Rattrapage & Purification)** :
   - Les mots échoués durant n'importe quelle session sont capturés dans `failedWords` (DB & local).
   - Règle stricte des **3 Cœurs consécutifs** : 3 bonnes réponses d'affilée requises pour purifier définitivement un mot. Une erreur réinitialise le compteur du mot à 0 cœur.

### 1.3 Ergonomie & Claviers d'Aide Virtuels (WanaBoard)
- **Architecture Mobile 60/40** : L'écran mobile est verrouillé en portrait et scindé mathématiquement : la Carte de Jeu occupe 60% de l'écran (avec texte adaptatif via `clamp()`) et le clavier WanaBoard 40%, garantissant que l'input n'est jamais caché.
- **Saisie Ultra-Rapide** : Clavier d'aide contextuel intégré directement sous le champ de saisie sur tous les modes (`Game.jsx`, `VengeanceMode.jsx`, `TugOfWarArena.jsx`).
- **Ergonomie du Clavier** : 
  - Ligne 1 dédiée aux articles (der, die, das).
  - Ligne 2 dédiée aux trémas/Eszett (ä, ö, ü, ß).
  - Touches d'action colorées (Entrée en vert, Effacer en rouge).
  - Sensation de frappe mécanique (Game Feel) via enfoncement 3D CSS sans re-rendu DOM coûteux.
- **Insertion en 1 Clic** :
  - Articles allemands : `der`, `die`, `das` (remplace ou insère l'article sans désélectionner le champ).
  - Caractères spéciaux : `ä`, `ö`, `ü`, `ß` (insère à la position précise du curseur).
- **Zéro perte de focus** : Le champ de saisie reste actif en permanence pour préserver la fluidité de frappe sur mobile et ordinateur.

---

## 2. ARCHITECTURE TECHNIQUE (STACK)

### 2.1 Stack Frontend
- **Framework & Build** : React 19 + Vite 8 (Vanilla CSS, CSS Modules & Tokens).
- **Temps Réel & Réseau** : Socket.IO Client 4.8.x.
- **PWA & Offline** : `vite-plugin-pwa` / Workbox (Service Worker, pré-mise en cache des sons, fonts et assets statiques).
- **Rendu & Audio** : Web Audio API (synthèse sonore zéro dépendance `soundEngine.js` + singleton `sfxManager.js`), Web Speech API (`de-DE`), Canvas 2D pour particules 60fps.
- **Micro-Store** : `realtimeStore.js` basé sur `useSyncExternalStore` (uSES) pour un state réactif haute performance.

### 2.2 Stack Backend
- **Serveur & Routage** : Node.js (v20+) + Express 4.x + Socket.IO Server 4.8.x.
- **Performance & Diagnostic** :
  - `server/utils/diagnostics.js` : Surveillance continue de l'Event Loop (alerte si lag > 100ms), traçage global des rejections/exceptions, monitoring de la mémoire vive (`process.memoryUsage()`).
  - Algorithme de Levenshtein haute performance (`server/utils/levenshtein.js`) basé sur un tableau 1D typé `Int32Array` (`O(min(N,M))` mémoire) avec chemins rapides (*fast-paths*) et sorties anticipées.
  - Ramasse-miettes automatique des sessions orphelines (`cleanStaleSessions` toutes les 15 min via `.unref()`).

### 2.3 Base de Données & Indexation MongoDB
- **Mongoose / MongoDB Atlas** :
  - `User` : Index sur `firebaseId`, `name`, `xp`, `lastSeen` et index composé `{ xp: -1, gamesWon: -1 }` pour un chargement des classements et profils sous les 50ms.
  - `List` : Index sur `userId`, `isPublic`, `createdAt` et index composés `{ isPublic: 1, createdAt: -1 }` et `{ userId: 1, createdAt: -1 }`.
  - `MatchSchedule` : Index sur `hostId`, `guestId`, `scheduledDate`, `status`.
  - `Notification` : Index composé `{ userId: 1, createdAt: -1 }`.
  - `Config` : Index unique sur `key`.

### 2.4 Spécificités Mobiles & Cross-Platform (Capacitor)
L'application web est encapsulée via Capacitor pour offrir une expérience Android/iOS native irréprochable :
- **Écran de Démarrage Animé (SplashScreen)** : `AppSplashScreen.jsx` offre un Cold Start fluide avec logo néon animé et barre de progression (0 à 100% en 1.2s), éliminant tout flash ou texte brut au démarrage.
- **Authentification Native Google Auth** : Remplacement des popups web par le plugin natif `@codetrix-studio/capacitor-google-auth` pour garantir la connexion Google (avec configuration dans `strings.xml` et `google-services.json`).
- **Barre d'État (StatusBar) Dynamique** : `@capacitor/status-bar` est synchronisé en temps réel sur le thème actif (`THEME_STATUS_BAR` dans `App.jsx`) avec inversion automatique du contraste d'icônes (`Style.Dark` / `Style.Light`).
- **Verrouillage Portrait Matériel** : `android:screenOrientation="portrait"` configuré sur `MainActivity` dans `AndroidManifest.xml`.
- **Safe Areas & Découpe Caméra (Notch)** : Prise en charge intégrale de `env(safe-area-inset-top)` et `env(safe-area-inset-bottom)` dans `index.css` et `Layout.jsx`.
- **Verrouillage Clavier Natif** : L'ergonomie reposant sur le *WanaBoard* (clavier virtuel 40% de l'écran), le clavier de l'OS (Gboard, etc.) ne doit jamais s'ouvrir. Le plugin `@capacitor/keyboard` est configuré avec `resize: "none"`, et le champ de saisie (`BattleConsole.jsx`) utilise un faux input (`div` avec `tabIndex="0"` et `inputMode="none"`).
- **Retour Haptique (Vibrations)** : Module `utils/haptics.js` universel couplé aux effets sonores (`AudioContext.jsx`) pour des micro-vibrations lors de la saisie, des succès et des erreurs.
- **Bouton Retour Matériel (Android)** : `@capacitor/app` intercepte `hardwareBackPress` pour fermer les menus/pause ou demander confirmation avant de quitter.
- **Synthèse Vocale (TTS)** : Bascule dynamique sur `@capacitor-community/text-to-speech` sur mobile pour éviter les bugs de mute natifs, et repli sur `window.speechSynthesis` sur web classique.

---

## 3. GAMEPLAY & LOGIQUE MÉTIER

### 3.1 Vérification des Réponses & Tolérance Orthographique
L'algorithme de validation compare la chaîne soumise à la réponse attendue selon 3 niveaux :
1. **Correspondance Parfaite (100% Score)** : Correspondance exacte sensible aux articles de genre et à la casse.
2. **Faute Tolérée / Typo (75% Score - Badge Ambre)** : Tolérance si la distance de Levenshtein `<= 1` (ou `<= 2` pour les mots longs `> 6` lettres) avec normalisation des caractères allemands (`ä->ae`, `ö->oe`, `ü->ue`, `ß->ss`).
3. **Erreur / Incorrect (0% Score - Badge Rouge & Shake)** : Mauvais article, mot erroné ou dépassement du chronomètre.

### 3.2 Optimisation Frontend Snappy & Zéro Saccade
- **Isolation des Timers** : Les chronomètres (`GameTimerBadge`, `VengeanceTimerBar`) tournent dans des sous-composants mémoïsés avec leur propre intervalle. Leurs ticks (10Hz) ne déclenchent aucun re-rendu de l'arène parente ni du champ de texte.
- **Champ de saisie autonome** : `GameInputForm` gère son état local de frappe pour garantir 0ms de latence de frappe.
- **Accélération Matérielle GPU** : Utilisation exclusive de `transform: translate3d()`, `will-change: transform` et `scaleX()` pour les jauges d'énergie et barres de progression.

---

## 4. ARCHITECTURE AUDIO & SFX

### 4.1 Gestionnaire Singleton SFX & Synthétiseur Web Audio
- **`sfxManager.js`** : Singleton audio partagé gérant les effets polyphoniques, les bruits de clic, de succès, de défaite, et la musique de fond (`ambient-loop.mp3`).
- **`soundEngine.js` (Web Audio pur)** : Synthèse d'arpèges C5-C6 en ondes triangle / dent de scie pour le mode Tir à la Corde sans dépendance à des fichiers audio externes.
- **Gestion rigoureuse des ressources** : Déconnexion systématique des nœuds audio à la fin de leur lecture (`onended`), libération via `dispose()` et arrêt de la synthèse vocale au démontage.

---

## 5. RÉSEAU, WEBSOCKETS & RÉSILIENCE MOBILE

### 5.1 Gestion des Déconnexions & Fermeture de Session
- **Nettoyage Immédiat** : Si un joueur quitte ou se déconnecte d'un salon ou d'une partie, la session est immédiatement détruite sur le serveur.
- **Événement `session_closed`** : Notification instantanée à tous les participants restants via un toast explicite (*« Le lobby est fermé à cause de la déconnexion de l'autre joueur »*) et redirection automatique vers l'accueil (`home`).
- **Tolérance Réseau** : Configuration de Socket.IO avec `pingInterval: 25000` et `pingTimeout: 60000` pour absorber les micro-coupures 4G.
- **Sortie de Veille Mobile** : Écoute des événements `visibilitychange`, `focus` et `pageshow` pour rétablir proactivement le socket si nécessaire.

---

## 6. SYSTÈME DE THÈMES & DESIGN SYSTEM CSS

### 6.1 Les 8 Thèmes Intégrés
- `midnight` (Défaut - Sombre Indigo & Verre Fumé)
- `deepspace` (Noir Cosmique, Étoiles & Cyan)
- `cyberpink` (Néon Cyberpunk Rose & Fuchsia)
- `emerald` (Vert Émeraude Compétitif)
- `sunset` (Orange Crépuscule & Violet)
- `hacker` (Noir Terminal & Vert Phosphore)
- `nordic` (Bleu Arctique Épuré)
- `dracula` (Violet Gothique Sombre)

### 6.2 Standards des Boutons 3D & Glassmorphism
- Boutons mécaniques avec ombre solide de 4px (`0 4px 0 var(--primary-shadow)`).
- Effet d'enfoncement physique au clic (`transform: translateY(4px) scale(0.95)`).
- Cartes en verre dépoli avec `backdrop-filter: blur(16px)` et bordure luminescente subtile.

---

## 7. ARBORESCENCE DU PROJET & COMPOSANTS CLÉS

### 7.1 Structure des Dossiers
```
Wana-Allmand-2/
├── client/                      # Frontend PWA (React 19 + Vite 8)
│   ├── public/                  # Manifest, icônes, sons (/sounds/*.mp3)
│   ├── src/
│   │   ├── components/          # Composants UI & Arènes de jeu
│   │   │   ├── BattleCard.jsx       # Wrapper central UI (60/40)
│   │   │   ├── BattleConsole.jsx    # Composant de saisie unifié (Fake Input)
│   │   │   ├── VirtualKeyboard.jsx  # Clavier WanaBoard avec haptique
│   │   │   ├── TugOfWarArena.jsx    # Arène du Mode Tir à la Corde
│   │   │   ├── TugOfWarBeam.jsx     # Jauge d'énergie Cyan vs Crimson
│   │   │   ├── ParticleBurst.jsx    # Système de particules Canvas 60fps
│   │   │   ├── TypoFallingVFX.jsx   # Effet de chute physique de lettres
│   │   │   ├── Game.jsx             # Arène Duel & Classique
│   │   │   ├── VengeanceMode.jsx    # Mode Purification & Survie
│   │   │   ├── Home.jsx, Lobby.jsx, Results.jsx, Layout.jsx, Admin.jsx, Profil.jsx
│   │   ├── context/             # AudioContext.jsx
│   │   ├── utils/               # sfxManager.js, soundEngine.js, levenshtein.js, useSocketEvent.js
│   │   ├── App.jsx              # Orchestrateur & Routeur principal
│   │   ├── index.css            # Design System, Thèmes, Boutons 3D
│   │   └── main.jsx
├── server/                      # Backend API & WebSocket (Node.js + Express)
│   ├── game/                    # GameManager.js (Gestion sessions & Matchmaking)
│   ├── models/                  # Schémas Mongoose (User, List, MatchSchedule, Notification, Config)
│   ├── utils/                   # diagnostics.js, levenshtein.js, pdfParser.js
│   └── index.js                 # Serveur Express, Handlers Socket.IO
├── android/                     # Projet Natif Android (Capacitor)
│   ├── app/src/main/            # Sources Java/Kotlin, AndroidManifest.xml
│   └── app/build/outputs/apk/   # Dossier de génération des builds (.apk)
└── 00-historique/               # Historiques quotidiens & Master Context
    ├── ENV_CONFIG.md            # Configuration et variables de production
    └── .env                     # Variables d'environnement de référence
```

---

## 8. ÉVÉNEMENTS SOCKET.IO DE RÉFÉRENCE (CHEAT SHEET)

| Événement Socket (Client ➔ Serveur) | Description & Payload |
| :--- | :--- |
| `create_session` | `{ listId, listTitle, words, roundTime, hostName, avatar, userId }` |
| `join_session` | `{ sessionId, playerName, avatar, userId }` |
| `leave_session` | `{ sessionId }` |
| `start_game` | `{ sessionId }` |
| `submit_answer` | `{ sessionId, answer, timeRemaining }` |
| `chat_message` | `{ sessionId, message, senderName, avatar }` |
| `send_reaction` | `{ sessionId, emoji, playerName }` |
| `send_invite` | `{ targetSocketId, targetUserId, sessionId, sessionTitle, hostName }` |

| Événement Socket (Serveur ➔ Client) | Description & Payload |
| :--- | :--- |
| `session_created` / `session_joined` | Renvoie l'objet complet de la session (`players`, `settings`, `id`) |
| `player_joined` / `player_left` | Mise à jour en direct de la liste des joueurs d'un salon |
| `session_closed` | Destruction de la session (déconnexion de l'autre joueur, retour accueil) |
| `game_started` | Déclenchement de la première manche avec liste des questions |
| `round_result` | Résultat de la manche (`scores`, `correctAnswer`, `rankings`) |
| `game_over` | Fin de partie avec podium final et statistiques complètes |
| `config_updated` | Diffusion en direct des nouveaux réglages admin (Kill Switch) |
| `online_users_updated` | Liste actualisée des utilisateurs connectés sur la plateforme |
| `receive_invite` | Réception d'une invitation directe à rejoindre un salon privé |

---

## 9. SYNTHÈSE DES ÉVOLUTIONS ET MISES À JOUR ARCHITECTURALES (29 AOÛT 2026)

Le 29 août 2026 a marqué une série d'optimisations majeures de performance, de refonte de l'expérience utilisateur et d'enrichissement du gameplay :

### 9.1 Performance Frontend & Élimination des Fuites Mémoire
- **Isolation du Chronomètre & Zéro Saccade** : Mémoïsation des composants `GameTimerBadge` et `VengeanceTimerBar`. Leurs décomptes à 10Hz n'entraînent aucun re-rendu sur l'arbre de composants parent ni sur les champs de saisie.
- **Latence de Saisie à 0ms** : Encapsulation du champ de saisie (`GameInputForm`) avec son état local autonome pour une frappe instantanée sans friction.
- **Stabilisation des Écouteurs Socket.IO** : Emploi de `useRef` pour éviter la destruction et réinscription cyclique des 16 listeners d'événements à chaque manche.
- **Gestion Propre du Web Audio** : Centralisation sur le singleton `sfxManager`, déconnexion systématique des nœuds oscillateurs/gains sur l'événement `onended`, libération `dispose()` et arrêt automatique de `window.speechSynthesis`.
- **Accélération GPU CSS** : Remplacement des animations de secousse et jauges de progression par des transformations GPU 3D (`translate3d`, `scaleX`, `will-change: transform`).

### 9.2 Ergonomie & Claviers Virtuels Allemands Intégrés (WanaBoard 60/40)
- **Architecture 60/40 sur Mobile** : Implémentation d'un layout `100dvh` où l'arène prend exactement 60% et le clavier 40%, empêchant tout chevauchement du champ de saisie.
- **Textes Dynamiques** : Utilisation de `clamp()` sur la police (`font-size: clamp(1rem, 5vw, 1.25rem)`) pour garantir qu'un long mot allemand ne brise jamais la grille 60/40.
- **Barres d'Insertion Rapide** : Ajout de boutons cliquables sous les champs de saisie structurés par type :
  - Ligne 1 : Pronoms / Articles : `der`, `die`, `das` (remplacement ou insertion intelligente).
  - Ligne 2 : Caractères spéciaux : `ä`, `ö`, `ü`, `ß`.
  - Couleurs sémantiques (Vert pour validation, Rouge pour suppression) et feeling mécanique 3D.
  - Retour sonore (`sfxManager.playClick()`) couplé à la vibration haptique native.
- **Comportement Fluide (Menu/Pause)** : Le clavier glisse vers le bas (`transform: translateY(100%)`) et la carte s'étend à 100% de l'écran de manière fluide à l'ouverture d'un menu, chat ou menu de Pause via l'état `isHidden`.
- **Stabilité Flexbox (Fix 60/40)** : L'ensemble des conteneurs racines des modes (y compris `VengeanceMode` et `TugOfWarArena`) n'utilisent plus de hauteur forcée (`min-height: 100vh`). Ils utilisent `height: 100%; flex: 1; overflow: hidden;` afin de se rétracter parfaitement à `60dvh` lorsque `.mobile-keyboard-active` est actif. À l'intérieur, le conteneur `BattleCard` garantit un espacement (`space-evenly`) empêchant l'écrasement de l'input.
- **Accessibilité Mobile & Desktop** : Ajustement du conteneur du Mode Vengeance pour rendre le bouton « PRÊT ? GO ! » immédiatement visible sans nécessiter de défilement sur petits écrans.
- **Réinitialisation Fiable des Manches** : Clé dynamique `key={round_${questionIndex}}` garantissant le redémarrage à 15s à chaque manche.

### 9.3 Résilience Réseau & Gestion Stricte des Déconnexions
- **Fermeture Immédiate & Nettoyage de Session** : Suppression instantanée de la session côté serveur dès qu'un joueur quitte ou se déconnecte, émission de l'événement `session_closed`, toast d'alerte explicite et redirection automatique des participants restants vers l'accueil.
- **Optimisation des Tunnels & Réseau 4G** : Ajustement du `pingInterval` à 25s et du `pingTimeout` à 60s pour absorber les micro-coupures.
- **Sortie de Veille Mobile** : Détection des reprises de session via `visibilitychange`, `focus` et `pageshow`.

### 9.4 Haute Performance Backend & Surveillance Serveur
- **Module de Diagnostic (`server/utils/diagnostics.js`)** : Détection active du lag de l'Event Loop (> 100ms), capture globale des erreurs (`uncaughtException`, `unhandledRejection`) et monitoring périodique de la RAM (`process.memoryUsage()`).
- **Ramasse-Miettes Serveur & Destruction Active** : Méthode `destroySession` annulant tous les timers en attente (`roundTimer`, `autoAdvanceTimer`) et nettoyage automatique `cleanStaleSessions` toutes les 15 minutes.
- **Indexation Mongoose Optimale** : Création d'index simples et composés sur les collections `User`, `List`, `MatchSchedule`, `Notification` et `Config` pour des temps de réponse sous les 50ms.
- **Levenshtein CPU-Optimized** : Refonte en tableau 1D typé `Int32Array` (`O(min(N,M))` mémoire) avec sorties anticipées et chemins rapides sans allocation superflue.

### 9.5 Nouveau Mode de Jeu « Tir à la Corde » (Rayon Énergétique)
- **Gameplay Compétitif de Poussée** : Intégration du mode `tug_of_war` dans le sélecteur du lobby (`PlayDropdown`).
- **Composants Dédiés** :
  - `TugOfWarArena.jsx` : Arène de jeu complète avec bot IA (`Valkyrie-AI`), pauses, raccourcis et modales de fin.
  - `TugOfWarBeam.jsx` : Faisceau d'énergie dynamique Cyan vs Crimson avec calcul de force en temps réel.
  - `ParticleBurst.jsx` : Moteur de particules Canvas 60fps avec cristaux en losange rotatifs pour les impacts (Émeraude, Ambre, Cramoisi).
  - `TypoFallingVFX.jsx` : Effet physique de chute et rotation des lettres erronées.
- **Audio Dédié** : Synthèse Web Audio pure (`soundEngine.js`) sans dépendance de fichiers externes.

### 9.6 Administration & Outil d'Annotation Agentation
- Intégration globale du composant `<Agentation />` dans `App.jsx`, accessible et activable en permanence pour l'administrateur (`VITE_ADMIN_UID`, `localStorage`, `window.enableAdmin()`). L'accès est bloqué sur téléphone natif Capacitor (`window.Capacitor.isNative`).
- Section de contrôle administrateur intégrée dans l'onglet `Profil.jsx`.

### 9.7 Optimisations PWA, Cache & SEO (30 AOÛT 2026)
- **Code Splitting (Vite 8)** : Découpage du bundle principal via `manualChunks` (`vendor-react`, `vendor-firebase`, `vendor-socket`, `vendor-confetti`, `vendor-agentation`) pour éliminer le fichier monolithique de 1.17 Mo.
- **Mise en cache VitePWA & Workbox** : Extension des règles pour inclure les statiques, polices et sons (SFX) jusqu'à 15Mo, avec stratégies `StaleWhileRevalidate` et `CacheFirst`.
- **Minification Vite 8** : Activation native de `cssMinify` et `cssCodeSplit`.
- **Keep-Alive Render** : Ajout de routes `GET /`, `/health` pour empêcher le Cold Start.
- **SEO & Performance** : Ajout de `preconnect` et `dns-prefetch` pour Google Fonts et Firebase. Désactivation du délai de 300ms au double-tap (Safari iOS).

---

## 10. SYNTHÈSE DES ÉVOLUTIONS (31 AOÛT 2026 - CAPACITOR & ARCHITECTURE MOBILE)

### 10.1 Portabilité Mobile & Capacitor (Android)
- **Build Natif, Synchronisation & Compilation APK** : Intégration de `@capacitor/core`, `@capacitor/cli`, et `@capacitor/android`. Commandes de synchronisation (`npm run sync:android`) et chaîne de compilation Gradle complète (`assembleDebug`) exécutée avec le JDK 17+ embarqué d'Android Studio (`jbr`), configuré dans `gradle.properties` via `org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr`.
- **Génération du Fichier APK & Google Services** : Intégration du fichier `google-services.json` dans `client/android/app/` activant le plugin `com.google.gms.google-services`. L'APK debug (`WanaAllmand.apk`, ~20.1 Mo) est généré dans `client/android/app/build/outputs/apk/debug/app-debug.apk` et copié à la racine du projet sous `WanaAllmand.apk`.
- **Compatibilité AGP (Android Gradle Plugin)** : Remplacement de `proguard-android.txt` par `proguard-android-optimize.txt` dans `build.gradle` de l'application et du plugin `@codetrix-studio/capacitor-google-auth`.
- **Immersif & Status Bar** : Intégration de `@capacitor/status-bar` (barre d'état dark mode `#0b0f19`) et ajustements `WindowInsetsControllerCompat` pour supprimer la barre de navigation.
- **Google Auth Natif & Correctif Détection** : Utilisation de `Capacitor.isNativePlatform()` (au lieu de `window.Capacitor.isNative` obsolète) pour router systématiquement l'authentification sur le flux natif `@codetrix-studio/capacitor-google-auth` en environnement APK/mobile, éliminant l'erreur de pop-up bloquée dans la WebView. Configuration du plugin injectée dans `capacitor.config.json` (`serverClientId`, scopes `profile`, `email`, `forceCodeForRefreshToken: true`).
- **Empreinte de Signature Debug** : SHA-1 debug (`87:31:A9:DF:46:90:4F:A3:3C:C0:79:DC:45:C5:BD:69:95:0B:A2:76`) / SHA-256 (`98:3A:55:73:39:BC:3B:5F:0C:BC:6C:3F:33:60:DF:E6:06:59:96:0C:74:BC:A0:BC:CB:50:D0:41:80:EF:C9:6E`).
- **Text-To-Speech Natif** : Remplacement par `@capacitor-community/text-to-speech` sur mobile pour corriger le bug de mute, avec fallback sur `window.speechSynthesis` en web.
- **Bouton Retour Matériel (Hardware Back Press)** : Écoute via `@capacitor/app` pour gérer la navigation (fermeture de menus ou prompt avant de quitter l'app).
- **Configuration Réseau & Permissions** : Autorisation HTTP/HTTPS via `android:usesCleartextTraffic="true"`, et ajout des permissions `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` dans l'AndroidManifest. Correction de la configuration Android Studio (`gradle.settings.xml`), et remplacement des dépôts dépréciés `jcenter()` par `mavenCentral()` dans le plugin `@codetrix-studio/capacitor-google-auth`.

### 10.2 Refonte de l'Architecture Mobile 60/40 (WanaBoard)
- **Layout Strict 60/40** : Arène verrouillée à 60% et clavier virtuel WanaBoard à 40% sur mobile via `.mobile-keyboard-active`, empêchant tout chevauchement.
- **Typographie Fluide** : Utilisation de `font-size: clamp()` sur les champs de saisie pour absorber les mots allemands très longs.
- **Animation du Clavier Virtuel** : Injection de `.keyboard-hidden` (`translateY(100%)`) à l'ouverture du Menu ou en Pause, libérant instantanément 100% de l'écran pour la carte de jeu.
- **Anti-Écrasement Flexbox** : Suppression des `min-height: 100vh` sur les arènes (`TugOfWarArena`, `VengeanceMode`) remplacés par `flex: 1; overflow: hidden`.
- **Verrouillage du Clavier OS** : `@capacitor/keyboard` (`resize: none`) et `inputMode="none"` sur le `fake-input` pour interdire au Gboard/Samsung Keyboard de s'ouvrir.

### 10.3 Uniformisation des Modes & UI
- **Wrapper BattleCard** : Intégration centralisée de `BattleCard` dans les 3 modes (Game, Vengeance, TugOfWar) pour encadrer le WanaBoard et la console. Amélioration de `BattleCard` avec `flex: 1` pour s'adapter au conteneur parent sans forcer `100vh`.
- **Sélecteur de Mode (PlayDropdown) & Accueil** : Rendu adaptatif du dropdown (`zIndex: 9999`, `minWidth/maxWidth`) pour 100% de visibilité mobile. Nettoyage du modal de bienvenue (`OnboardingTour`) avec la suppression de l'icône rebondissante supérieure.
- **Console Unifiée (BattleConsole)** : Création de `BattleConsole.jsx`, un fake-input autonome avec 'Smart Logic' d'auto-capitalisation, remplaçant les anciens champs de saisie dans tous les modes.
- **Clavier Virtuel WanaBoard (VirtualKeyboard)** : Création de `VirtualKeyboard.jsx` avec prise en charge QWERTY/AZERTY, touches allemandes, Game Feel (animation `translateY(4px)` pure), retour haptique et sonore (`sfxManager.playClick()`).
- **Nettoyage UI** : Suppression du réglage manuel de la taille du clavier (slider) dans `Profil.jsx`, la hauteur étant maintenant verrouillée à 40%.
- **Logo Officiel** : Nouveau `logo.jpg` remplaçant l'ancien `favicon.svg` dans `index.html`, `manifest.webmanifest`, et config Capacitor.
- **Déploiement Vercel** : Ajout d'un `.npmrc` avec `legacy-peer-deps=true` pour forcer l'installation des dépendances liées à `@capacitor/core` sur Vercel.
- **Règle d'Historique** : Ajout de `.agents/rules/historique.md` imposant le format strict `historique_YYYY-MM-DD.md`.

### 10.4 Architecture du Tutoriel Hybride (Onboarding Suite)
- **Cycle de Vie & Déclenchement Post-Auth** : Le tutoriel est découplé de l'initialisation de l'application et n'apparaît qu'une fois l'utilisateur connecté avec son compte Google et entré dans l'accueil (`user` présent + `hasEnteredApp === true`). Un pop-up d'invitation initial non bloquant propose de lancer le tour guidé (*« C'est parti ! 🚀 »*) ou de le remettre à *« Plus tard »*.
- **Moteur d'Étapes (`OnboardingContext.jsx`)** : State machine globale gérant les phases :
  - `WELCOME_PROMPT` : Invitation post-connexion.
  - `STEP_DUEL` (1/5) : Présentation des duels 1v1 et des salons avec codes à 4 lettres.
  - `STEP_SPECIAL_MODES` (2/5) : Présentation du Tir à la Corde et du Mode Survie.
  - `STEP_LISTS` (3/5) : Présentation des listes de vocabulaire et du partage communautaire.
  - `STEP_VENGEANCE` (4/5) : Présentation du Mur de la Vengeance et de la purification d'erreurs.
  - `STEP_SOLO` (5/5) : Invitation à cliquer sur le bouton vert 'S'entraîner en Solo'.
  - `STEP_LOBBY` : Explication du salon d'attente (statut prêt, joueurs connectés).
  - `TYPE_HUND` : Mission d'échauffement in-game avec chrono infini ('∞') et incitation à taper 'Hund'.
  - `ARTICLE_WARNING` : Alerte sonore/visuelle avec secousse (`shake`) explicitant la règle vitale des articles `der/die/das`, et validation victorieuse avec 'der Hund'.
- **Composants Dédiés** :
  - `OnboardingOverlay.jsx` : Découpe de trou spotlight (`clipPath`) avec aura néon pulsante (`#00f0ff` en mode normal, `#ef4444` en mode avertissement article), assurant un focus visuel sans perte d'interactions.
  - `TutorialStep.jsx` : Boîte de dialogue Cyberpunk ultra-soignée avec badges thématiques, pastilles de progression (`● ● ○ ○ ○`), boutons de navigation fluide (Précédent / Suivant), bouton persistant « Passer le tutoriel ✕ », et positionnement dynamique adaptatif (au-dessus de la cible si en bas d'écran ou sur mobile au-dessus du WanaBoard).
  - `Profil.jsx` : Carte dédiée « 🎓 Tutoriel d'Apprentissage » permettant de relancer à volonté le tutoriel complet via `resetOnboarding()`.
- **Auto-Centrage & Smooth Scroll** : `OnboardingContext.jsx` déclenche `scrollIntoView({ behavior: 'smooth', block: 'center' })` avec recalcul en continu (`requestAnimationFrame`) lors de chaque transition d'étape pour garantir que l'élément mis en surbrillance est parfaitement visible et centré.
- **Game Feel & Audio** : Déclenchement coordonné des effets sonores Web Audio (`playNotification`, `playAlert`, `playVictory`, `playClick`) et vibrations haptiques à chaque transition d'étape.

### 10.5 Mini-Jeu Aléatoire "Matching Pairs" (Course aux Paires)
- **Concept** : Mini-jeu de rapidité intervenant de manière aléatoire (50% de probabilité) entre deux manches du Duel Classique. Le joueur doit relier 5 paires de mots (Français ➔ Allemand) en moins de 15 secondes.
- **Mécanique & UI** :
  - L'arène affiche le composant autonome `MatchingPairs.jsx` en lieu et place du `BattleConsole`.
  - Le `VirtualKeyboard` est temporairement masqué pour maximiser l'espace.
  - Le chronomètre principal est suspendu au profit d'une barre de progression locale (15s).
- **Game Feel & Feedback** :
  - **Pitch Crescendo** : Le singleton audio `sfxManager` génère un son dont le pitch (fréquence de base) augmente à chaque nouvelle paire validée, renforçant le stress positif (`playPitchUp`).
  - **Vibrations** : Haptique `success` sur chaque paire, `error` (avec pénalité de blocage de 2s et réinitialisation du combo), et `success_heavy` pour la validation totale.
  - **Particules** : Émission de Confettis (`canvas-confetti`) lors de la complétion totale.
- **Logique Serveur** : Intégrée dans `GameManager.js` avec l'événement `submit_matching_pairs` qui récompense instantanément le joueur avec un jackpot massif d'XP (+300) s'il réussit avant la fin du temps imparti, sans pénaliser l'adversaire (résolution en "aveugle").

## 10.6. G�n�ration IA (AIGeneratorView)
- **Localisation** : client/src/components/AIGeneratorView.jsx et server/index.js (route /api/extract).
- **Description** : Permet aux utilisateurs d'extraire automatiquement du vocabulaire � partir d'un fichier multim�dia (Image, PDF) ou de texte coll�, avec des options de filtrage linguistique avanc�es.
- **Moteur IA** : Utilise le SDK @google/genai (mod�le Gemini 3.6 Flash) pour traiter des prompts dynamiques incluant des instructions syst�me pour configurer le comportement (exclusion des pr�noms, ajout des articles der/die/das, etc.).
- **Int�gration** : Remplace les anciens boutons 'G�n�ration IA' et 'Coller du texte' de Home.jsx par un acc�s direct � cette interface premium.

- **Options d'Administration Avancées :** Le panel Super Admin permet désormais d'activer dynamiquement des règles de gameplay via le paramètre \orceMatchingPairs\ enregistré en MongoDB. Cela force la boucle de jeu à déclencher ce mini-jeu à 100% de probabilité pour faciliter le debug.

 # #   1 0 . 7 .   L a y o u t   &   C S S   6 0 / 4 0   ( M o b i l e ) 
 -   * * F l e x b o x   S h r i n k   I s s u e   ( R � s o l u ) * *   :   L ' a r c h i t e c t u r e   d e   l a   c a r t e   ( B a t t l e C a r d )   e n   m o d e   V e n g e a n c e   e t   T i r   �   l a   C o r d e   s ' � c r a s a i t .   
 -   * * C o r r e c t i f   I n p u t * *   :   \  l e x - s h r i n k :   0 \ ,   \ w h i t e - s p a c e :   n o w r a p \ ,   \ o v e r f l o w :   h i d d e n \   e t   \ 	 e x t - o v e r f l o w :   e l l i p s i s \   a p p l i q u � s   �   l ' i n p u t   e t   s e s   w r a p p e r s   ( \ B a t t l e C o n s o l e . j s x \   e t   \ i n d e x . c s s \ ) . 
 -   * * S t a n d a r d i s a t i o n * *   :   S t a n d a r d i s a t i o n   d u   \ j u s t i f y - c o n t e n t :   s p a c e - b e t w e e n \   s u r   l e s   v u e s   ( V e n g e a n c e M o d e . j s x ,   T u g O f W a r A r e n a . j s x )   e t   r � d u c t i o n   d e s   m a r g e s   d e s   h e a d e r s   p o u r   c o m p a c t e r   l ' U I . 
  
 
## Mise � jour (2026-09-01)
- **BattleConsole** : Ajout d'une fonctionnalit� *Admin* via la prop dminAnswer. Un bouton cach� (A) permet de remplir l'input avec la bonne r�ponse (en minuscule) pour les tests et la d�mo (int�gr� dans VengeanceMode et TugOfWarArena).
- Correction CSS: R�solution d'une erreur de syntaxe dans index.css (r�tablissement de la directive @keyframes pour shake-hard) qui bloquait le processus de build (2026-09-01).

## Mise à jour (01 Sept 2026)
- **Composants & Logique UI :** Le composant `MatchingPairs.jsx` dépend impérativement des classes CSS `.selected`, `.matched` et `.error` dans `index.css` pour fournir un retour visuel aux joueurs lors de la sélection. Sans elles, l'interface semble inactive.
