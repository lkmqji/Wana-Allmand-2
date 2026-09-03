# MASTER PRODUCT & TECHNICAL CONTEXT — WANA ALLMAND

> **Document de Référence pour l'Architecture, le Game Design et l'Ingénierie Logicielle.**  
> Destiné aux développeurs et agents d'ingénierie logicielle intervenant sur la plateforme **Wana Allmand**.

---

## 1. PRODUCT VISION & UX

### 1.1 Objectif & Proposition de Valeur
**Wana Allmand** est une application web progressive (**PWA**) EdTech gamifiée et hautement compétitive, conçue pour maîtriser le vocabulaire et la grammaire allemande (articles de genre *der/die/das*, déclinaisons, orthographe stricte, trémas et *Eszett* `ß`).  
À la croisée d'un outil d'apprentissage ultra-pédagogique et d'un jeu multijoueur temps réel (type *Quiz Arena* / *Brawl Stars*), elle élimine la passivité de l'apprentissage traditionnel grâce à la pression du chronomètre, aux classements en direct, aux duels multijoueurs synchronisés et au système de rattrapage punitif mais gratifiant : le **Mur de la Vengeance**.

### 1.2 Core Loop (Boucle de Jeu Principale)
La boucle d'engagement repose sur un cycle à 3 temps :
```
[ 1. LOBBY & PRÉPARATION ] ➔ [ 2. DUEL / GAMEPLAY OU SURVIE ] ➔ [ 3. RÉSULTATS & VENGEANCE ]
          ▲                                                                 │
          └───────────────────── (Purification des erreurs) ────────────────┘
```
1. **Lobby & Matchmaking** :
   - Sélection d'une liste de vocabulaire (listes officielles A1/A2/B1/B2, listes personnalisées, imports PDF/texte ou listes communautaires).
   - Mode Solo (Contre-la-montre / Entraînement) ou Multijoueur temps réel (salon privé avec code, invitations d'amis en ligne, chat de salon, timers personnalisables).
2. **Duel / Arène de Jeu** :
   - Séquence de questions chronométrées (par défaut ~15s en duel, ~10.5s en mode survie/vengeance).
   - Le joueur doit saisir la traduction exacte en allemand avec son article de genre.
   - Feedback audio et visuel instantané, calcul de score pondéré par la distance de Levenshtein, animations de secousse (shake) en cas d'erreur.
3. **Résultats, Analyse & Mur de la Vengeance** :
   - Podium, calcul d'XP, progression de niveau, attribution d'avatars et badges.
   - Les mots échoués durant la session sont automatiquement interceptés et stockés dans le registre des erreurs (`failedWords` dans `localStorage` et base de données).
   - **Mode Vengeance** : Accessible depuis le tableau de bord pour "purifier" les erreurs accumulées selon la règle stricte des **3 Cœurs consécutifs**.

### 1.3 Identité Visuelle & Direction Artistique
- **Dark Mode & Glassmorphism** : Fond immersif sombre (`#0b0f19` en thème Midnight), cartes translucides avec `backdrop-filter: blur(16px)` ou `blur(24px)` (`--glass-bg`, `--glass-border`).
- **Lueurs Néon & Éléments Radiaux** : Dégradés d'ambiance avec `radial-gradient` floutés en arrière-plan et effets `box-shadow` luminescents (Indigo `#6366f1`, Rose Néon `#ec4899`, Vert Hacker `#00ff66`, Cyan Glacier `#00f0ff`).
- **Spring Physics Animations** : Transitions et micro-interactions élastiques utilisant des courbes de Bézier dynamiques (`--spring-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275)`, `--spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Boutons Tactiles 3D (Neumorphism / Depth Buttons)** : Bordures biseautées, reflets intérieurs (`inset 0 1px 1px rgba(255, 255, 255, 0.35)`), ombres portées solides créant une profondeur d'extrusion de 4px à 6px (`0 4px 0 var(--primary-shadow)`), s'enfonçant de 4px lors du clic (`:active: transform: translateY(4px)`).
- **Typographie** : Police moderne Google Font **Outfit** (`400`, `600`, `700`, `800`).

---

## 2. ARCHITECTURE TECHNIQUE (STACK)

### 2.1 Stack Frontend
- **Framework & Runtime** : **React 19** (`react@^19.2.8`, `react-dom@^19.2.8`), **Vite 8** (`vite@^8.2.0`, `@vitejs/plugin-react@^6.0.4`).
- **PWA Integration** : `vite-plugin-pwa@^1.2.0` avec `registerSW({ immediate: true })` pour mise à jour instantanée du Service Worker sans cache zombie.
- **Routage & Modales** : Contrôlé par état racine (`view: 'home' | 'lobby' | 'game' | 'results' | 'vengeance'`) combiné à `react-router-dom@^7.18.2`.
- **Animations & Particules** : `canvas-confetti@^1.9.4`, CSS Keyframes natifs.
- **Contrôle & Inspection UI** : `agentation@^3.0.2` en mode développement.

### 2.2 Stack Backend
- **Serveur & API** : **Node.js** (CommonJS), **Express 5** (`express@^5.2.1`), `cors@^2.8.6`, `multer@^2.2.0`.
- **Temps Réel & WebSockets** : **Socket.IO 4** (`socket.io@^4.8.3` côté serveur, `socket.io-client@^4.8.3` côté client) avec double transport `['polling', 'websocket']`.
- **Parsing Documents** : `pdf-parse@^1.1.1` pour l'extraction automatique de listes de vocabulaire à partir de polycopiés et PDF.
- **Gestionnaire de Parties** : `GameManager.js` encapsulant l'état mémoire des salons (`sessions` Map), la synchronisation des timers, le calcul des scores et le cycle de vie des manches.

### 2.3 Base de Données & Authentification
- **Base de Données Principale** : **MongoDB** via **Mongoose 9** (`mongoose@^9.9.2`).
  - Schémas clés : `User.js` (profil, stats, XP, niveau, historique d'erreurs `failedWords`), `List.js` (listes de vocabulaire publiques/privées), `Config.js` (flags d'administration globale), `Notification.js`.
- **Authentification** : **Firebase Auth 12** (`firebase@^12.17.1`) avec fournisseur Google OAuth (`GoogleAuthProvider`, `signInWithPopup`, `onAuthStateChanged`) + Mode Invité local (`isGuest = true`).

### 2.4 Gestion du State Global
1. **Micro-Store Temps Réel (uSES - `useSyncExternalStore`)** :
   - Fichier : [`realtimeStore.js`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/stores/realtimeStore.js).
   - Offre une réactivité synchrone $O(1)$ sans re-render intempestif pour les flux temps réel WebSocket.
   - Expose des hooks sélecteurs mémorisés : `useOnlineUsers()`, `useSession()`, `usePlayers()`, `useIsHost()`, `useChatMessages()`, `useNotifications()`, `useUnreadCount()`, `useToastNotif()`, `useIncomingInvite()`, `useAnnouncement()`.
   - Supporte des mutations scalaires et des fonctions de rappel de mise à jour (`realtimeStore.setSession(prev => ...)`).
2. **État d'Orchestration Racine** :
   - Fichier : [`App.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx).
   - Gère `user`, `isGuest`, `playerName`, `avatar`, `theme`, `config` globale, `activeTab` et `view`.
3. **Persistance `localStorage`** :
   - Cache des préférences utilisateurs : `wana_theme`, `wana_sound_enabled`, `wana_master_volume`, `wana_sfx_volume`, `wana_bgm_volume`, `wana_music_muted`, `wana_game_music_muted`, `wana_failed_words`, `wana_player_name`, `wana_avatar`, `wana_app_config`.
   - Sauvegarde de progression d'une session de Vengeance / Survie en cours via la clé dynamique `wana_prog_{surv|veng}_{modeTitle}`.

---

## 3. MÉCANIQUES CLÉS (BUSINESS LOGIC)

### 3.1 Vérification des Réponses & Algorithme de Levenshtein
La validation d'un mot saisi par l'utilisateur par rapport à la réponse attendue suit un protocole linguistique rigoureux défini dans [`server/utils/levenshtein.js`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/utils/levenshtein.js) et [`client/src/components/VengeanceMode.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx).

```
                            [ Saisie Utilisateur ]
                                      │
                                      ▼
                        [ Normalisation du Texte ]
             (minuscules, suppression diacritiques, ß ➔ ss, trim)
                                      │
                                      ▼
                  [ Détection & Extraction de l'Article ]
           (Articles surveillés : der, die, das, den, dem, des, ein, eine, einen)
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [ Si Article Obligatoire ]            [ Si Pas d'Article Requis ]
        Article attendu !== saisi ?                        │
                   │                                     │
         ┌─────────┴─────────┐                           │
      [ OUI ]             [ NON ]                        │
  (Mismatch franc :    (Article OK)                      │
   Score / 2 ou Rejet)       └─────────────────┬─────────┘
                                               │
                                               ▼
                             [ Distance de Levenshtein sur le Nom ]
                             dist = levenshteinDistance(expNoun, actNoun)
                             maxTypos = max(1, floor(length / 5))
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
          dist === 0                   dist <= maxTypos                 dist > maxTypos + 1
       Score = 100 pts                 Score = 100 pts (isTypo: true)      Score = 0 pt
       (Succès Parfait)                (Tolérance coquille légère)         (Erreur Totale)
```

- **Règle stricte des Articles Allemands** :
  - Si le mot attendu comprend un article défini/indéfini (`der Hund`), l'utilisateur **doit** fournir l'article adéquat.
  - En mode Duel (serveur) : Si l'article est erroné ou manquant, le score est pénalisé de moitié (`Math.floor(score / 2)`).
  - En mode Vengeance (client) : Un article incorrect invalide immédiatement la réponse (`articleMatched = false`).
- **Tolérance aux Fautes de Frappe (Typos)** :
  - La tolérance s'exprime par `maxTypos = Math.max(1, Math.floor(expNoun.length / 5))`.
  - Pour les mots $\ge 4$ caractères, une coquille minime ($\le maxTypos$) valide le mot pour éviter la frustration sur mobile.

### 3.2 Le Mur de la Vengeance & Mode Survie
Composant : [`VengeanceMode.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx).

1. **Mécanique des 3 Cœurs ❤️❤️❤️** :
   - Chaque mot de la file d'attente (`queue`) possède un compteur `hearts: 0`.
   - Pour purifier définitivement un mot, le joueur doit fournir **3 bonnes réponses consécutives** (`newHearts >= 3`).
   - À 3 cœurs, l'état `isExploding` déclenche le son procédural `playExplosion()`, un bonus de **+50 XP**, et le mot est retiré de la file.
2. **Reset Punitif à Zéro ❤️ ➔ 🖤🖤🖤** :
   - Toute mauvaise réponse ou expiration du chronomètre (**10.5s**) réinitialise instantanément le compteur de cœurs du mot à **0** (`hearts: 0`).
   - Le mot reste dans la file et repassera dans un ordre ultérieur après rotation.
3. **Correction Active (Pédagogie de l'Erreur)** :
   - En cas d'erreur ou de timeout, le jeu se verrouille en mode `mustTypeCorrection = true`.
   - L'écran affiche un comparateur visuel des caractères fautifs barrés en rouge (`renderFaultComparison()`).
   - La voix de synthèse allemande (TTS `de-DE`) énonce immédiatement la bonne prononciation.
   - Le joueur est **obligé de retaper le mot allemand correct** dans son intégralité avant de pouvoir passer à la question suivante.
4. **Système de Lots (Batching & Shuffle)** :
   - Le joueur peut choisir d'exécuter un lot complet ou partiel (ex: 5, 10, 20 mots ou la totalité des erreurs).
   - Les mots sont mélangés à l'aide de l'algorithme cryptographique **Fisher-Yates Shuffle** (`fisherYatesShuffle()`).
5. **Persistance & API `/purify`** :
   - Progression sauvegardée automatiquement dans `localStorage` à chaque frappe pour survivre à un rechargement de page.
   - En fin de purification d'un mot, si l'utilisateur est authentifié (`user.uid`), une requête `PUT` est émise vers `/api/users/:uid/purify` avec `{ word }` pour supprimer définitivement le mot de la base MongoDB et créditer l'XP.

---

## 4. ARCHITECTURE AUDIO & SFX (GAME FEEL)

### 4.1 Moteur Audio Hybride (Web Audio API & SFX Manager)
Fichiers : [`sfxManager.js`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/utils/sfxManager.js) et [`AudioContext.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/context/AudioContext.jsx).

```
                      [ Synthèse Procédurale Web Audio API ]
                                        │
                                        ▼
                                [ sfxGainNode ] (Volume SFX * Multiplier 1.85)
                                        │
                                        ▼
                               [ masterGainNode ] (Master Volume * Multiplier 1.35)
                                        │
                                        ▼
                        [ compressorNode (Anti-Clipping) ]
                (Threshold: -1.0dB, Knee: 8, Ratio: 12, Attack: 3ms, Release: 150ms)
                                        │
                                        ▼
                             [ ctx.destination ] (Haut-parleurs)
```

- **Latence Zéro & Synthèse Procédurale** :
  - `sfxManager.js` synthétise tous les effets de jeu en temps réel via oscillateurs (`OscillatorNode`) et générateurs de bruit (`AudioBufferSourceNode`) : `playHover()`, `playClick()`, `playSuccess()`, `playError()`, `playExplosion()`, `playCountdownTick()`, `playCountdownGo()`, `playTimeWarning()`, `playVictory()`, `playDefeat()`, `playLevelUp()`, `playFreeze()`, `playOpponentAnswered()`, `playMessageSent()`, `playNotification()`.
  - Intègre un compresseur dynamique anti-saturation (`DynamicsCompressorNode`) empêchant toute distorsion harmonique lors du cumul d'effets sonores.
  - Dispose d'un limiteur de fréquence pour le survol (`hoverThrottleMs: 50ms`).
- **Gestion Stagée des Volumes** :
  - 3 canaux distincts contrôlés par sliders : Master (`masterVolume`), Effets (`sfxVolume`), Musique de fond BGM (`bgmVolume`).

### 4.2 Déverrouillage de l'Autoplay Browser Policy via `<TitleScreen />`
Les navigateurs modernes (Chrome, Safari iOS, Edge) bloquent l'émission de son tant qu'une interaction utilisateur volontaire n'a pas eu lieu.
- Le composant [`TitleScreen.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/TitleScreen.jsx) sert de passerelle d'activation :
  - Dès le clic sur "COMMENCER", il invoque `sfx.unlockAudio()` qui réveille l'`AudioContext` suspendu (`ctx.resume()`).
  - Il déclenche ensuite la musique d'ambiance `startBgm()` et le jingle d'introduction `playGameStart()`.
  - Une transition fluide de 500ms est appliquée avant de basculer sur l'interface principale.

### 4.3 Synthèse Vocale (Web Speech API de-DE)
- **Prononciation Allemande Native** :
  - Fonction `speakGermanWord(word, isSoundEnabled)` : utilise `window.speechSynthesis` et configure un objet `SpeechSynthesisUtterance` avec `utterance.lang = 'de-DE'` et un tempo naturel `utterance.rate = 0.95`.
  - **Règle Anti-Triche** : Le mot allemand n'est **jamais** énoncé avant que le joueur n'ait soumis sa réponse (seul un ticker sonore neutre retentit à l'affichage). La prononciation allemande intervient comme renforcement positif après une bonne réponse, ou comme guide auditif lors de la correction active d'une erreur.

---

## 5. RÉSEAU, PWA & RÉSILIENCE MOBILE

### 5.1 Hard Gate PWA (`<InstallGate />`) & Kill Switch
Composant : [`InstallGate.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/InstallGate.jsx).

- **Détection de Mode Standalone (`evaluateStandalone()`)** :
  - Vérifie si l'application s'exécute en mode PWA autonome (`display-mode: standalone` ou `navigator.standalone === true`).
  - Accès automatiquement autorisé sur `localhost`, `127.0.0.1` ou sur les navigateurs d'ordinateurs de bureau (Desktop Mac/PC).
- **Contournement des Navigateurs Intégrés (In-App Browsers)** :
  - Détecte si l'utilisateur ouvre le lien depuis Instagram, Facebook, TikTok, Snapchat, Messenger via User-Agent (`checkIsInAppBrowser()`).
  - Affiche un guide illustré invitant l'utilisateur à cliquer sur les "3 points" pour ouvrir le lien dans le vrai Safari ou Chrome.
- **Support d'Installation Dédié** :
  - **Android / Chrome** : Capture et déclenche l'événement `beforeinstallprompt` via `handleInstallClick()`.
  - **iOS / Safari** : Affiche les instructions étape par étape (icône Partager ➔ "Sur l'écran d'accueil").
- **Admin Kill Switch** :
  - Le serveur expose la configuration sur `/api/config` (`requirePwaInstall: boolean`).
  - Si l'administrateur désactive l'obligation depuis [`Admin.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Admin.jsx), un événement Socket `config_updated` est diffusé et l'ensemble des clients lève instantanément le blocage sans rechargement.

### 5.2 Résilience des WebSockets & Mise en Veille Téléphone
1. **Configuration Socket.IO** :
   ```javascript
   const socket = io(API_URL, {
     transports: ['polling', 'websocket'],
     reconnection: true,
     reconnectionAttempts: 15,
     reconnectionDelay: 1000,
     timeout: 10000
   });
   ```
2. **Gestion de la Mise en Veille (Page Visibility API)** :
   - Écoute de l'événement `document.addEventListener('visibilitychange')`.
   - À la réouverture de l'application mobile (passage à `visibilityState === 'visible'`), l'audio suspendu est réactivé (`sfx.unlockAudio()`) et le socket force une reconnexion immédiate si la connexion a été coupée par l'OS.
3. **Hook `useSocketEvent` (Ref-Trampolining Synchrone)** :
   - Fichier : [`useSocketEvent.js`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/utils/useSocketEvent.js).
   - Résout définitivement le problème des **Stale Closures** (fermetures obsolètes) en React :
     ```javascript
     export function useSocketEvent(socket, eventName, handler) {
       const handlerRef = useRef(handler);
       handlerRef.current = handler; // Mise à jour synchrone de la référence
       useEffect(() => {
         if (!socket || !eventName || typeof handler !== 'function') return;
         const listener = (...args) => handlerRef.current?.(...args);
         socket.on(eventName, listener);
         return () => socket.off(eventName, listener);
       }, [socket, eventName]);
     }
     ```
   - Garantit que le callback WebSocket exécute toujours le dernier état sans devoir réattacher inutilement des écouteurs sur le socket.

---

## 6. SYSTÈME DE THÈMES & DESIGN SYSTEM CSS

### 6.1 Les 8 Thèmes Intégrés
Le changement de thème s'effectue dynamiquement en appliquant l'attribut `data-theme="nom_theme"` sur la balise `<body>` ou l'élément racine.

| Thème | Clé `data-theme` | Ambiance & Couleurs Principales | Accent (`--primary`) |
| :--- | :--- | :--- | :--- |
| **Midnight** *(Défaut)* | `midnight` | Cyber Dark, Indigo sombre, verre fumé | `#6366f1` |
| **Sakura** | `sakura` | Rose pastel clair, doux, esthétique kawaii | `#ec4899` |
| **Hacker** | `hacker` | Noir profond Matrix, vert néon cybernétique | `#00ff66` |
| **Glacier** | `glacier` | Océan arctique, bleu glacier et cyan électrique | `#00f0ff` |
| **BloodDuel** | `bloodduel` | Anthracite & Crimson, rouge sang compétitif | `#ef4444` |
| **Sunset** | `sunset` | Braise crépusculaire, nuances orange et ambre | `#f97316` |
| **Classic Light** | `classic` / `light` | Thème clair épuré, contraste doux type SaaS | `#2563eb` |
| **Cyber Pink** | `cyberpink` / `darkrose` | Noir violet, néon rose fuchsia électrisant | `#ff007f` |

### 6.2 Variables CSS Globales Obligatoires
Chaque thème injecte les tokens fondamentaux suivants :
- `--bg-main` : Fond de page global.
- `--card-bg` / `--bg-surface` : Fond des cartes et conteneurs.
- `--primary` / `--accent-primary` : Couleur d'action principale.
- `--primary-shadow` : Couleur d'ombre solide sous les boutons 3D.
- `--text-main` / `--text-muted` : Couleurs de texte hiérarchisées.
- `--border-color` : Délimitation des blocs.
- `--glass-bg` / `--glass-border` : Propriétés du verre translucide.

### 6.3 Standards des Boutons 3D
Tous les boutons de l'application héritent de la classe de base `.btn` et de ses déclinaisons :
- `.btn` : Base structurelle, typographie majuscule grasse, transition `cubic-bezier(0.16, 1, 0.3, 1)`.
- `.btn-primary` : Action majeure (Dégradé Primaire, ombre portée de 4px `0 4px 0 var(--primary-shadow)`).
- `.btn-secondary` : Action secondaire ou navigation (Fond surface neutre, bordure discrète).
- `.btn-success` : Validation, réussite ou gain d'XP (Dégradé Vert `#10b981` ➔ `#059669`, ombre `0 4px 0 #047857`).
- **Comportement `:active`** : Déplacement physique immédiat `transform: translateY(4px) scale(0.95)` annulant l'ombre inférieure pour simuler un bouton mécanique enfoncé.

---

## 7. ARBORESCENCE DU PROJET & RÔLE DES 10 COMPOSANTS MAJEURS

### 7.1 Structure des Dossiers
```
Wana-Allmand-2/
├── client/                      # Frontend PWA (React 19 + Vite)
│   ├── public/                  # Favicons, manifest PWA, sons (/sounds/*.mp3)
│   ├── src/
│   │   ├── assets/              # Logos, icônes SVG
│   │   ├── components/          # Composants React de l'interface
│   │   ├── context/             # AudioContext.jsx (Provider Son & Musique)
│   │   ├── data/                # exampleLists.js (Listes de vocabulaire par défaut)
│   │   ├── stores/              # realtimeStore.js (Micro-store uSES)
│   │   ├── utils/               # sfxManager.js, dictionary.js, useSocketEvent.js, formatters.js
│   │   ├── App.jsx              # Orchestrateur racine & Routeur
│   │   ├── firebase.js          # Client SDK Firebase Auth
│   │   ├── index.css            # Feuille de style globale (Thèmes, 3D Buttons, Glassmorphism)
│   │   └── main.jsx             # Point d'entrée React avec ErrorBoundary & ServiceWorker
│   ├── package.json
│   └── vite.config.js
├── server/                      # Backend API & WebSocket (Node.js + Express + Socket.IO)
│   ├── game/                    # GameManager.js (Moteur de parties & Salons)
│   ├── models/                  # Schémas Mongoose (User, List, Config, Notification)
│   ├── utils/                   # levenshtein.js, pdfParser.js, formatters.js
│   ├── index.js                 # Serveur Express, endpoints API & handlers Socket.IO
│   └── package.json
└── docs/                        # Documentation & Guides d'ingénierie
```

### 7.2 Rôle des 10 Composants React Majeurs

1. **[`App.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx)** :  
   Orchestrateur suprême. Initialise l'instance singleton Socket.IO, écoute l'état d'authentification Firebase, gère la navigation entre vues (`home`, `lobby`, `game`, `results`, `vengeance`), intercepte la détection PWA Standalone et applique le Kill Switch administrateur.
2. **[`Home.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Home.jsx)** :  
   Tableau de bord central multi-onglets (`Apprentissage`, `Mes Listes`, `Communauté`, `Statistiques`, `Profil`). Propose le bouton de lancement rapide, l'accès au Mode Survie, le compteur de mots à purifier et les streaks quotidiens.
3. **[`Game.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx)** :  
   Arène de jeu temps réel (Solo ou Multijoueur). Gère l'affichage des questions, le compte à rebours circulaire, la saisie utilisateur, l'évaluation des réponses, les animations de score en direct et les effets sonores d'ambiance.
4. **[`Lobby.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Lobby.jsx)** :  
   Salle d'attente multijoueur. Permet à l'hôte de configurer la partie (liste de vocabulaire, durée des manches, nombre de questions), d'inviter des amis en ligne, de voir les joueurs connectés et d'échanger sur le chat en direct.
5. **[`Results.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Results.jsx)** :  
   Écran de fin de partie. Affiche le podium des vainqueurs, les gains d'XP et montées de niveau avec animations de confettis, récapitule les erreurs commises et propose de les transférer directement en Mode Vengeance.
6. **[`VengeanceMode.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx)** :  
   Moteur de purification des erreurs et Mode Survie. Implémente la règle des 3 cœurs consécutifs, le reset punitif à zéro, la correction active obligatoire par saisie et la communication avec l'API `/purify`.
7. **[`TitleScreen.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/TitleScreen.jsx)** :  
   Écran-titre d'introduction cinématographique. Déverrouille la politique d'autoplay audio des navigateurs lors de l'interaction initiale de l'utilisateur (`sfx.unlockAudio()`), lance la BGM et le son de démarrage.
8. **[`InstallGate.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/InstallGate.jsx)** :  
   Portail de blocage PWA. Guide les utilisateurs mobiles vers l'installation en mode PWA autonome (instructions spécifiques iOS Safari, déclencheur natif Android Chrome et avertissements pour navigateurs intégrés).
9. **[`Layout.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Layout.jsx)** :  
   Coquille structurelle et responsive de l'application. Affiche la barre latérale sur ordinateur (Desktop Sidebar), la barre supérieure mobile et la barre de navigation basse tactile (Mobile Bottom Nav).
10. **[`Admin.jsx`](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Admin.jsx)** :  
    Console d'administration globale. Permet la gestion des listes de vocabulaire, la modération et l'ajustement d'XP des utilisateurs, l'envoi d'annonces en temps réel et le pilotage du Kill Switch PWA / Mode Invité / Maintenance.

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
| `game_started` | Déclenchement de la première manche avec liste des questions |
| `round_result` | Résultat de la manche (`scores`, `correctAnswer`, `rankings`) |
| `game_over` | Fin de partie avec podium final et statistiques complètes |
| `config_updated` | Diffusion en direct des nouveaux réglages admin (Kill Switch) |
| `online_users_updated` | Liste actualisée des utilisateurs connectés sur la plateforme |
| `receive_invite` | Réception d'une invitation directe à rejoindre un salon privé |
