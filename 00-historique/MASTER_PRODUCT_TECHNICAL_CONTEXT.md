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
└── 00-historique/               # Historiques quotidiens & Master Context
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
- **Comportement Fluide** : Le clavier glisse vers le bas (`transform: translateY(100%)`) et la carte s'étend à 100% de l'écran de manière fluide à l'ouverture d'un menu ou chat.
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
- Intégration globale du composant `<Agentation />` dans `App.jsx`, accessible et activable en permanence pour l'administrateur (`VITE_ADMIN_UID`, `localStorage`, `window.enableAdmin()`).
- Section de contrôle administrateur intégrée dans l'onglet `Profil.jsx`.
