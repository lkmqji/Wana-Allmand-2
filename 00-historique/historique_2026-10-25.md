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
