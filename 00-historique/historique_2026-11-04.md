# Historique des modifications — 04 novembre 2026

### 2026-11-04 22:55 — Déploiement & Synchronisation GitHub : Site Web (Vercel), Serveur & Application Android v2.0 (APK)

#### Contexte & Objectif
- Publication et synchronisation sur le dépôt distant GitHub (`lkmqji/Wana-Allmand-2`) de l'ensemble des évolutions majeures de la version 2.0.
- Assurer le déploiement automatique sur Vercel pour le frontend Web/PWA, la mise à jour du backend temps réel et la mise à disposition du nouvel APK Android racine ([WanaAllmand.apk](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/WanaAllmand.apk)).

---

#### 1. Composants & Fonctionnalités Publiés

1. **Restauration & Consolidation de l'IA Médicale ([client/src/services/geminiService.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/services/geminiService.js) & [server/services/geminiServerService.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/services/geminiServerService.js))** :
   - Cascade résiliente multi-modèles Google Gemini Flash (`gemini-3-flash-preview` ➔ `gemini-flash-lite-latest` ➔ `gemini-2.5-flash`).
   - Nettoyeur LaTeX médical `cleanLatexMath`.
   - Moteur d'explication clinique en 4 cartes (Piège Clinique, Justification des 5 propositions, Démarche diagnostique, Règle d'or concours).
   - Tuteur IA conversationnel interactif dans le chat de débriefing (commande `/ia` et toggle `[🤖 Tuteur IA]`).

2. **Système de Salons Multijoueurs (2 à 10 Joueurs) & Règles de Consensus** :
   - Capacité dynamique réglable de 2 à 10 joueurs dans le Lobby avec grille eSport responsive.
   - Privilège exécutif de l'Hôte : passage immédiat et prolongation sans vote.
   - Règle de décision collective des invités : validation dès que la moitié des joueurs a voté (`Math.floor(totalPlayers / 2)`).
   - Double bouton de prolongation temporelle de débriefing : `+1 min` (+60s) et `+3 min` (+180s).
   - Résilience réseau : poursuite automatique de la partie lors du départ d'un participant tant qu'il reste $\ge 2$ joueurs.

3. **Système Autonome de Mise à Jour GitHub Releases (client/src/services/updateService.js & client/src/components/UpdateModal.jsx)** :
   - Vérification automatique de nouvelle version SemVer au démarrage (2.2s).
   - Bouton de contrôle manuel dans l'onglet Profil avec statut en temps réel.
   - Fenêtre modale Glassmorphism avec changelog détaillé et téléchargement direct du fichier APK.
   - Déclaration de version `2.0.0` (Build 2) dans `client/src/constants/version.js`.

4. **Application Android & Build v2.0** :
   - Mise à jour Gradle `versionCode 2` et `versionName "2.0"` dans `client/android/app/build.gradle`.
   - Nouveau binaire [WanaAllmand.apk](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/WanaAllmand.apk) compilé et prêt à l'emploi (19.6 Mo).
   - Notes de version officielles rédigées dans [RELEASE_NOTES_v2.0.md](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/RELEASE_NOTES_v2.0.md).

---

#### 2. Validation & Contrôles Pré-Déploiement
- **Vérification syntaxique Node.js** : `node -c server/index.js server/services/geminiServerService.js` validée avec 0 erreur (Code 0).
- **Compilation de production Vite / PWA** : `npm.cmd --prefix client run build` validée à 100% avec 120 modules compilés en 1.22s, Service Worker PWA généré sans erreur.
- **Synchronisation Master Context** : `00-historique/MASTER_PRODUCT_TECHNICAL_CONTEXT.md` mis à jour et aligné sur l'architecture active.



---

### 2026-11-04 23:10 — Résolution du Dysfonctionnement du Bouton "🚪 Quitter" en Cours de Partie

#### Problème identifié
- Lorsqu'un utilisateur mettait le jeu en pause et cliquait sur le bouton **« 🚪 Quitter »** dans le bandeau de pause (ou dans le menu déroulant en haut à gauche), la partie ne se fermait pas ou l'utilisateur restait bloqué dans le jeu.
- **Causes racines** :
  1. Dans `client/src/components/Game.jsx`, le clic sur `🚪 Quitter` appelait `handleRequestTerminate` qui émettait uniquement l'événement socket `request_terminate` sans proposer de sortie directe ou de confirmation.
  2. Côté serveur (`server/index.js`), en mode pédiatrique solo (`gameType === 'pedia'`), `session.vocabList` est vide (`[]`), donc `session.currentQuestionIndex = session.vocabList.length` fixait l'index à 0. L'appel consécutif à `sendNextQuestion` ré-incrémentait l'index à 1, ce qui relançait la question suivante et désactivait la pause sans jamais terminer la partie.
  3. En mode multijoueur, le joueur était enfermé dans une attente passive d'approbation adverse (« En attente de la confirmation de votre adversaire... »), sans possibilité d'abandonner unilatéralement si l'adversaire était inactif.
  4. Le composant `Game` dans `client/src/App.jsx` ne recevait ni `setView` ni `onLeaveGame`, interdisant toute redirection directe vers l'accueil (`home`).

#### Correctifs apportés
1. **Composant Moteur de Jeu ([client/src/components/Game.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx))** :
   - Réception des props `setView` et `onLeaveGame`.
   - Ajout d'une fenêtre modale de confirmation dédiée (`showQuitConfirm`) : clic sur « 🚪 Quitter » ou « Quitter la partie » ouvre une invite claire avec « Annuler » ou « Oui, Quitter ».
   - Implémentation de `handleDirectLeave()` : émet `leave_session` au serveur, vide les messages de chat, et redirige instantanément l'utilisateur vers la vue d'accueil (`setView('home')` et dispatch de sécurité `wana:leave_to_home`).
   - Dans la modale de demande d'arrêt mutuel en attente, ajout d'un bouton de secours « 🚪 Quitter direct » permettant d'abandonner immédiatement sans attendre le joueur adverse.
   - Sécurisation de `handleAcceptTerminate` avec exécution de `handleDirectLeave()`.
2. **Composant Racine ([client/src/App.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx))** :
   - Transmission des props `setView={setView}` et du callback de nettoyage `onLeaveGame` à `<Game />`.
   - Ajout d'un écouteur d'événement global `window.addEventListener('wana:leave_to_home')` pour garantir un retour à l'accueil fiable et le reset complet des états de session.
3. **Serveur Backend ([server/index.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/index.js))** :
   - Correction de `request_terminate` : si la session est solo (ou si session introuvable), arrêt immédiat des minuteurs, invocation de `handlePlayerLeave` et émission de `session_closed` (compatible à 100% avec les modes allemand et pédiatrique).
   - Prise en charge propre de `accept_terminate` : diffusion de `session_closed` à l'ensemble du salon avec message d'interruption mutuelle et destruction de session.
4. **Validation Technique** :
   - Syntaxe Node.js vérifiée avec 0 erreur (`node -c server/index.js`).
   - Compilation de production Vite / PWA réussie (`npm.cmd --prefix client run build`) : 120 modules compilés en 997ms, Service Worker PWA régénéré.
   - Synchronisation des assets Capacitor Android validée (`npx.cmd cap sync android`).


---

### 2026-11-04 23:25 — Affichage des Votes pour l'Hôte et Double Option (Voter ou Passer Sans Vote) Entre les Questions

#### Contexte & Problème
- Entre les questions (pendant la phase de débriefing en mode pédiatrie ou sur le bandeau de score en mode allemand), l'hôte de la salle multijoueur ne voyait pas les votes des participants :
  - Sur le bouton de passage, seul le libellé fixe `⚡ Passer à la suite` était affiché pour l'hôte, masquant le compteur de participants prêts (`readyCount/totalPlayers`).
  - Sur les boutons de prolongation (+1 min et +3 min), seul `⚡ +1 min (Direct)` et `⚡ +3 min (Direct)` s'affichaient, sans indication des votes en cours.
  - Côté serveur, tout clic de l'hôte sur `ready_for_next` ou `vote_extend_debrief_time` était automatiquement interprété comme un passage en force unilatéral, interdisant à l'hôte de simplement voter pour participer au décompte collectif.

#### Correctifs apportés
1. **Visibilité Totale des Votes pour l'Hôte ([client/src/components/pedia/PediaReviewModal.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/pedia/PediaReviewModal.jsx) & [client/src/components/Game.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx))** :
   - L'hôte voit désormais en temps réel les compteurs dynamiques de votes sur tous les boutons :
     - Bouton de passage : `Voter Prêt (X/Y)` / `✓ Prêt (X/Y)`.
     - Prolongation +1 min : `+1 min (X/Y)` / `En attente (X/Y)`.
     - Prolongation +3 min : `+3 min (X/Y)` / `En attente (X/Y)`.
2. **Capacité pour l'Hôte de Voter Normalement** :
   - Lorsque l'hôte clique sur le bouton de passage ou sur les boutons +1 min / +3 min, son vote est enregistré dans `session.readyPlayers` et `session.extendVotes` aux côtés des autres participants.
   - Les statistiques sont instantanément rediffusées à tous les clients (`ready_count` et `debrief_extend_votes`), synchronisant l'état `isReady` de l'hôte.
   - Si le seuil requis est atteint grâce au vote de l'hôte, l'action s'exécute de façon collective.
3. **Maintien du Privilège Exécutif Hôte ("Passer sans vote" / Forcer le passage)** :
   - **Passage à la question suivante** : Un bouton dédié `⚡ Passer direct` est affiché à côté du bouton de vote pour l'hôte en multijoueur. Il permet de forcer immédiatement la suite sans attendre les votes des retardataires.
   - **Prolongations temporelles** : Un bouton intégré `⚡ Direct` est juxtaposé sur les pilules +1 min et +3 min, permettant à l'hôte d'injecter immédiatement le temps sans attendre le consensus.
4. **Logique Serveur ([server/index.js](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/server/index.js))** :
   - Mise à niveau de `ready_for_next` pour distinguer un vote régulier (`force: false`) d'un forçage direct (`force: true` ou événement `force_next_question`).
   - Prise en charge du paramètre `force` dans `vote_extend_debrief_time` pour permettre soit le vote normal de l'hôte, soit l'application directe.
   - Synchronisation temps réel des listes de votants (`voters`) transmises dans les événements Socket.IO.
5. **Validation** :
   - Syntaxe Node.js vérifiée sans erreur (`node -c server/index.js`).
   - Compilation de production Vite / PWA validée (`npm.cmd --prefix client run build`) : 120 modules compilés en 912ms.
   - Synchronisation des assets Capacitor Android validée.
