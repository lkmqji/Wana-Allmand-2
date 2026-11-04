# Historique des modifications — 25 octobre 2026

### 2026-10-25 01:05 — Capacité Multi-Joueurs (2 à 10 joueurs), Règle de Vote à la Moitié et Privilège Exécutif Hôte

#### Contexte & Objectif
Évolution majeure du système de salons (Lobby) et du flux de jeu :
1. Permettre à l'hôte de sélectionner la capacité maximale de joueurs par salon de **2 à 10 joueurs** (auparavant fixé à 2).
2. Adapter la règle de décision collective quand le nombre de joueurs est $> 2$ : il suffit que la **moitié des joueurs** vote pour exécuter l'action (ajouter du temps sur la page d'explication ou passer à la question suivante).
3. Donner à l'hôte le **pouvoir d'exécution directe sans vote** (passage immédiat à la question suivante ou ajout direct de +1 minute de débriefing).
4. Assurer la résilience de la partie lors de la déconnexion ou du départ d'un participant sans interrompre la partie des autres joueurs.

---

#### 1. Modifications Backend (`server/`)
- **Gestionnaire de Sessions (`server/game/GameManager.js`)** :
  - Support du paramètre `maxPlayers` (clamped entre 2 et 10, valeur par défaut 2) dans `createSession`.
  - Refonte de `joinSession` : validation dynamique sur `Object.keys(session.players).length >= maxPlayers` (suppression du verrou binaire hardcodé sur `guestId`).
  - Refonte de `leaveSession` : nettoyage propre des joueurs dans `players`, `readyPlayers` et `extendTimeVotes` sans détruire automatiquement la session si plus d'un joueur reste en jeu.
- **Serveur Socket.IO (`server/index.js`)** :
  - `create_session` : extraction et transmission du paramètre `maxPlayers`.
  - `update_session_settings` : validation de `maxPlayers` (l'hôte ne peut pas réduire la capacité sous le nombre de participants actuellement connectés), mise à jour et diffusion aux clients.
  - `ready_for_next` :
    - **Privilège Hôte** : si `socket.id === session.hostId`, exécution directe et passage immédiat à la question suivante pour tous.
    - **Vote Invités** : calcul dynamique du seuil de vote `Math.max(2, Math.floor(totalPlayers / 2))` quand `totalPlayers > 2` (et unanimité si $\le 2$). Avancement automatique dès que le seuil est atteint.
    - Émission de `ready_count` avec `{ ready, total: requiredVotes, totalPlayers }`.
  - `vote_extend_debrief_time` :
    - **Privilège Hôte** : ajout immédiat de +60 secondes pour toute la salle sans nécessiter de vote.
    - **Vote Invités** : bascule de vote et déclenchement dès que le seuil de la moitié `Math.max(2, Math.floor(totalPlayers / 2))` est atteint.
    - Émission de `debrief_extend_votes` avec `{ votesCount, requiredVotes, totalPlayers, voters }`.
  - `handlePlayerLeave` :
    - Si un invité quitte et qu'il reste au moins 2 joueurs : la session continue, le joueur est retiré, les votes et seuils sont recalculés et synchronisés en direct.
    - La session ne se ferme via `session_closed` que si l'Hôte quitte ou s'il reste moins de 2 joueurs.
  - Nettoyage d'une duplication de code (`server.listen`) en fin de fichier.

---

#### 2. Modifications Frontend (`client/`)
- **Composant Salon (`client/src/components/Lobby.jsx`)** :
  - Calcul dynamique de `maxPlayers` et `isRoomFull = playerCount >= maxPlayers`.
  - **Sélecteur Stepper de Capacité (2-10)** intégré directement dans l'en-tête de l'Arène pour l'hôte (`[-] N [+]`), avec synchronisation Socket temps réel.
  - Sélecteur de capacité également accessible dans l'onglet des Paramètres (modes Allemand et Pédiatrie).
  - **Affichage Adaptatif de l'Arène** :
    - Mode duel 1v1 Street Fighter / Smash Bros classique conservé si `maxPlayers === 2`.
    - Grille esport responsive (2 à 10 slots) si `maxPlayers > 2` : carte distincte pour l'hôte avec couronne 👑, cartes challengers avec avatars, nom, statut prêt et bouton d'expulsion ✕ pour l'hôte, et cartes d'attente ⏳ pointillées pour les slots vacants.
  - Adaptation des labels de lancement du match : `⚔️ DÉMARRER LE MATCH MULTIJOUEUR (X/Y)` et `🩺 DÉMARRER LE MATCH (X/Y)`.
- **Page de Débriefing & Explications (`client/src/components/pedia/PediaReviewModal.jsx`)** :
  - Réception de la prop `isHost`.
  - **Bouton Hôte Exécutif** : `⚡ Passer à la suite` (exécution immédiate) et `⚡ +1 min (Direct)`.
  - **Boutons Invités** : affichage transparent du ratio de vote nécessaire `Passer ➔ (prêts/requis)` et `+1 min (votes/requis)`.
- **Moteur de Jeu (`client/src/components/Game.jsx`)** :
  - Transmission du flag `isHost={session?.hostId === socket?.id}` au composant `PediaReviewModal`.
  - Adaptation du bouton de continuation en mode allemand : `⚡ CONTINUER (Direct)` pour l'hôte, `En attente (X/Y votes)...` pour les invités.
  - Prise en compte du seuil dynamique `requiredVotes` dans les écouteurs d'événements `ready_count` et `debrief_extend_votes`.
  - Correction d'un doublon de balises fermantes en bas de fichier.

---

#### 3. Validation Technique
- Validation syntaxique Node.js (`node -c`) sur `server/game/GameManager.js` et `server/index.js` (Code 0).
- Compilation de production Vite / PWA (`npm run build`) validée avec 116 modules transformés et 0 erreur (Code 0).

---

### 2026-10-25 08:12 — Diagnostic et Restauration Complète des Fonctionnalités IA (Tuteur Chat `/ia` & Raisonnement Clinique 4 Cartes) & Fusion Multijoueur +10

#### Diagnostic du Problème
- Lors de l'envoi de la mise à jour multijoueurs +10 (commit `bc96e6a`), le commit a été préparé depuis un état local antérieur au commit `02e6b84` (`feat(pedia): integration bouton +3 min, explication clinique IA (4 cartes) et tuteur IA dans le chat (/ia)`).
- En écrasant la branche principale sans fusion préalable, les fonctionnalités IA avaient été totalement supprimées :
  - `client/src/services/geminiService.js` avait été supprimé.
  - `server/services/geminiServerService.js` avait perdu les méthodes `generateReasoningNote` et `askAboutQuestion`.
  - `client/src/components/pedia/PediaReviewModal.jsx` avait perdu l'interface des 4 cartes d'explication IA, le Tuteur IA dans le chat (`/ia`, bouton dédié `[🤖 Tuteur IA]`, bulle de réflexion animée), et le bouton de prolongation `+3 min`.
  - `client/src/components/Game.jsx` avait perdu la gestion des messages IA et le suivi différencié des votes `+1 min` et `+3 min`.
  - `server/index.js` avait supprimé les métadonnées IA (`isAi`, `modelUsed`, `senderName`, `senderAvatar`) dans `game_chat_message` et restreint `vote_extend_debrief_time` à 1 minute seule.
  - `client/src/index.css` avait perdu les classes CSS dédiées (`.reasoning-cards-container`, `.reasoning-card`, `.card-trap`, `.badge-*`, `.chat-bubble.bubble-ai`, etc.).

#### Actions Correctives et Fusion Réussie
1. **Restauration des Services Gemini (`client/` & `server/`)** :
   - Restauration de [geminiService.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/services/geminiService.js) avec la cascade de modèles Flash, le nettoyeur LaTeX et les générateurs d'explication et de tuteur.
   - Restauration de `generateReasoningNote` et `askAboutQuestion` dans [geminiServerService.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/services/geminiServerService.js).
2. **Serveur Backend Temps Réel ([server/index.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/index.js))** :
   - Mise à niveau de `game_chat_message` pour accepter et diffuser à toute la salle multijoueur les messages avec `isAi`, `modelUsed`, `senderName` et `senderAvatar`.
   - Fusion harmonieuse de `vote_extend_debrief_time` :
     - Supporte les durées `+1 min` et `+3 min`.
     - **Privilège Hôte** : exécution directe et immédiate sans vote pour +1 min (`addedSeconds: 60`) ou +3 min (`addedSeconds: 180`).
     - **Vote Invités** : bascule de vote par durée (`session.extendVotes = { 1: Set, 3: Set }`) et déclenchement automatique dès que le seuil de la moitié `Math.max(2, Math.floor(totalPlayers / 2))` est atteint.
     - Diffusion de `debrief_extend_votes` avec les statistiques détaillées pour chaque durée (`votes1m`, `votes3m`, `requiredVotes`, `totalPlayers`).
3. **Interface Débriefing Pédia ([client/src/components/pedia/PediaReviewModal.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/pedia/PediaReviewModal.jsx))** :
   - Restauration du bloc d'explication clinique IA structuré en 4 cartes (Piège Clinique, Justification des 5 propositions, Démarche diagnostique, Règle d'or concours).
   - Restauration du Tuteur IA interactif dans le chat avec déclenchement automatique par commande `/ia` ou bouton à cocher `[🤖 Tuteur IA]`, bulle d'attente animée (`typing-indicator`) et réactions rapides (`🤖 Explique le piège !`).
   - Présence conjointe des **deux boutons de prolongation** (`+1 min` et `+3 min`) :
     - Pour l'hôte : `⚡ +1 min (Direct)` et `⚡ +3 min (Direct)`.
     - Pour les invités : `+1 min (votes/requis)` et `+3 min (votes/requis)` avec indicateur dynamique d'acceptation collective.
     - Pour passer à la suite : `⚡ Passer à la suite` (accès direct hôte) ou `Passer ➔ (prêts/requis)` (vote invités).
4. **Moteur de Jeu Client ([client/src/components/Game.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx))** :
   - Gestion de l'état `extendVotes` avec `votes1m` et `votes3m`.
   - Émission des messages chat de type IA vers Socket.IO et réception temps réel.
   - Transmission de l'ensemble des props nécessaires à `PediaReviewModal` (`isHost`, `extendVotes1m`, `extendVotes3m`, `extendTotalRequired`).
5. **Styles CSS ([client/src/index.css](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/index.css))** :
   - Réintégration complète des styles visuels pour les 4 cartes de raisonnement clinique, les badges néon, les bulles de chat IA et l'animation des points de saisie.

#### Validation & Tests
- Vérification syntaxique Node.js (`node -c`) sur `server/index.js` et `server/services/geminiServerService.js` : Succès (Code 0).
- Compilation de production Vite / PWA (`npm.cmd run build`) : 117 modules transformés, 0 erreur, PWA service worker généré avec succès en 649ms (Code 0).

---

### 2026-10-25 08:24 — Intégration du Vérificateur Automatique de Mises à Jour GitHub Releases et Compilation de Wana Allmand 2.0 APK (Build 2)

#### Contexte & Objectif
- Répondre à la demande utilisateur d'embarquer dans l'application APK Android une vérification automatique des mises à jour à chaque démarrage depuis les Releases GitHub (`lkmqji/Wana-Allmand-2`).
- Compiler un nouvel APK Android à jour incluant toutes les fonctionnalités récentes de Wana Allmand 2.0 (multijoueur 2-10, tuteur IA, raisonnement clinique 4 cartes, prolongations doubles +1m/+3m, privilèges hôte, clavier WanaBoard 60/40 / natif).
- Rédiger les notes de version officielles de la Release 2.0.

#### 1. Système de Vérification des Mises à Jour (`client/`)
- **Constantes de Version ([client/src/constants/version.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/constants/version.js))** :
  - Déclaration de `APP_VERSION = "2.0.0"`, `APP_VERSION_NAME = "2.0"`, `APP_BUILD_NUMBER = 2`.
  - Répertoire cible GitHub : `GITHUB_REPO = "lkmqji/Wana-Allmand-2"`.
- **Service de Détection ([client/src/services/updateService.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/services/updateService.js))** :
  - Comparateur de versions sémantiques (SemVer) robuste gérant les préfixes `v` et les builds numériques.
  - Appel à l'API GitHub (`/repos/:owner/:repo/releases/latest` avec repli gracieux sur `/releases`).
  - Détection automatique de l'asset `.apk` attaché à la release GitHub (nom, URL de téléchargement direct `browser_download_url`, taille formatée en Mo).
  - Gestion des préférences de rejet avec `dismissUpdateVersion` (`localStorage`).
  - Déclenchement de l'ouverture du lien de téléchargement compatible Web et Android (`window.open` / intention système).
- **Interface Utilisateur Dédiée ([client/src/components/UpdateModal.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/UpdateModal.jsx))** :
  - Modale Glassmorphism moderne affichant :
    - Badge de nouvelle version et version actuelle installée.
    - Taille du fichier APK et date de publication.
    - Notes de version / changelog déroulant.
    - Bouton d'action principal : `⚡ Télécharger la mise à jour (.APK)`.
    - Boutons secondaires : `Plus tard` et `Ne plus me rappeler pour cette version`.
- **Intégration au Démarrage ([client/src/App.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx))** :
  - Déclenchement automatique 2.2 secondes après le lancement pour ne pas perturber l'affichage initial et l'authentification.
  - Écouteur d'événement personnalisé `window.addEventListener('wana:show_update_modal')` permettant d'ouvrir la modale depuis n'importe quel écran.
  - Rendu global de `<UpdateModal />`.
- **Onglet Profil & Paramètres ([client/src/components/Profil.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Profil.jsx))** :
  - Nouvelle carte *« Application & Mises à jour »* affichant la version installée (`Wana Allmand 2.0 (Build 2)`).
  - Bouton manuel *« 🔄 Vérifier les mises à jour »* avec indicateur de statut immédiat (*« ✓ Votre version (v2.0) est à jour ! »* ou ouverture de la modale si une mise à jour est disponible).

#### 2. Configuration & Build Android (`client/android/`)
- Mise à jour de [client/package.json](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/package.json) : version portée à `"2.0.0"`.
- Mise à jour de [client/android/app/build.gradle](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/android/app/build.gradle) :
  - `versionCode 2`
  - `versionName "2.0"`
- Build de production web Vite (`npm.cmd run build`) : 120 modules compilés avec succès.
- Synchronisation Capacitor Android (`npx.cmd cap sync android`) : copie des assets web et mise à jour des 5 plugins natifs.
- Compilation Android Gradle (`.\gradlew.bat assembleDebug`) exécutée avec succès en 2m 03s.
- Remplacement du binaire racine [WanaAllmand.apk](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/WanaAllmand.apk) par le nouvel APK généré (taille : 19 611 598 octets / 19.6 Mo).

#### 3. Documentation de Release
- Création de [RELEASE_NOTES_v2.0.md](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/RELEASE_NOTES_v2.0.md) détaillant l'ensemble des fonctionnalités de Wana Allmand 2.0 prêtes pour la publication GitHub.


