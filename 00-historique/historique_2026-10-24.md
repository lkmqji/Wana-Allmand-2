# Historique des modifications — 24 octobre 2026

### 2026-10-24 21:40 — Intégration du Mode Médical Pédiatrique (PédiaDrill Arena)

#### Contexte & Objectif
Intégration complète d'un deuxième univers de jeu compétitif axé sur la médecine pédiatrique (`qcm-p-diatrie`), permettant aux étudiants et médecins de s'affronter en duel ou en solo sur 1 905 questions réparties dans 35 chapitres, tout en préservant à 100% l'intégrité du jeu d'allemand original (*Wana Allmand*).

---

#### 1. Moteur & Services Backend
- **Fournisseur de Données Médicales (`server/data/pediaProvider.js`)** :
  - Indexation et chargement dynamique des 35 chapitres de pédiatrie et des 1 905 questions médicales (QCM à choix multiples et CROQ à réponses ouvertes).
  - Algorithme de sélection et de mélange aléatoire selon les filtres (chapitre, nombre de questions, type d'épreuve).
  - Mécanisme anti-triche : `prepareLiveQuestion()` purge les réponses attendues et explications avant l'envoi de la manche ; `prepareDebriefQuestion()` ne les révèle qu'à la fin du round.
- **Moteur de Scoring Partiel QCM (`server/utils/qcmScorer.js`)** :
  - Calcul de score proportionnel avec pénalités pour les mauvaises options choisies afin d'éviter le hasard.
  - Bonus de rapidité dégressif calculé sur le temps restant.
- **Service d'Évaluation Sémantique IA pour les CROQ (`server/services/geminiServerService.js`)** :
  - Cascade multi-modèles Google Gemini Flash (`gemini-3-flash-preview` ➔ `gemini-flash-lite-latest` ➔ `gemini-2.5-flash`).
  - Évaluation sémantique des réponses cliniques rédigées : attribution d'un score (0-100%), retour pédagogique détaillé et note de raisonnement clinique.
  - Circuit-breaker avec repli automatique vers une évaluation locale hors-ligne en cas de panne réseau ou de quota dépassé.
- **Gestionnaire de Jeu (`server/game/GameManager.js` & `server/index.js`)** :
  - Support du paramètre `gameType: 'pedia'` pour les sessions.
  - Règle chronomètre CROQ : ajout automatique de **+30 secondes** pour les questions ouvertes de type CROQ.
  - Phase de débriefing de **60 secondes** avec diffusion du corrigé complet, des scores et gestion du bouton "Passer" mutuel permettant de zapper le chrono dès que tous les joueurs sont prêts.

---

#### 2. Interface Utilisateur & Composants Frontend
- **Sélecteur d'Univers sur la Page d'Accueil (`client/src/components/Home.jsx`)** :
  - Sélecteur à deux onglets modernes : 🇩🇪 *Wana Allmand* (Vocabulaire allemand) et 🩺 *PédiaDrill Arena* (Duels pédiatrie).
  - Carte de présentation dédiée pour créer un salon médical ou rejoindre avec un code.
- **Panneau de Configuration dans le Salon (`client/src/components/Lobby.jsx`)** :
  - Sélecteur de cours / chapitre parmi les 35 spécialités ou "Tous les cours".
  - Choix du nombre de questions (5 à 50) et du type d'épreuves (Mixte, QCM seuls, CROQ seuls).
  - Réglage du chrono de base avec affichage clair du bonus automatique de +30s pour les CROQ.
- **Carte d'Arène Médicale (`client/src/components/pedia/PediaArenaCard.jsx`)** :
  - Rendu clinique moderne : badge du chapitre, cas clinique stylisé, options QCM interactives (A à E) avec cases à cocher et zone de rédaction pour les CROQ.
  - Indicateur en direct lorsque l'adversaire a validé sa réponse.
- **Modal de Débriefing & Revue de 60s (`client/src/components/pedia/PediaReviewModal.jsx`)** :
  - Chronomètre et barre de progression animée de 60 secondes.
  - Comparatif des scores joueur vs adversaire sur la manche.
  - Analyse visuelle des propositions (vert pour vrai, rouge pour erreur, neutre pour correct non coché).
  - Corrigé officiel et note de cours détaillée (`explanation`).
  - Chat en direct intégré pour discuter du cas clinique entre joueurs pendant le débriefing.
  - Bouton interactif "Passer (X/2)" permettant d'avancer immédiatement dès que les joueurs ont validé.
- **Intégration dans le Moteur de Jeu (`client/src/components/Game.jsx` & `Results.jsx`)** :
  - Affichage automatique des composants pédiatriques sans perturber le mode allemand.
  - Masquage du clavier virtuel allemand (*WanaBoard*) en mode pédiatrie pour privilégier les touches d'options et le clavier natif pour les CROQ.
  - Résumé des questions médicales sur l'écran final de résultats.

---

#### 3. Validation & Tests
- Compilation frontend Vite réussie à 100% avec 0 erreur (`npm run build`).
- Vérification de la syntaxe de tous les modules serveurs (`node -c`).
- Chargement validé des 1 905 questions et 35 chapitres depuis le dossier source.

---

### 2026-10-24 21:56 — Résolution du blocage du défilement vertical (Scroll) en Arène Médicale

#### Problème identifié
- Sur les questions médicales contenant de longs cas cliniques (ex: cas clinique de 15 lignes sur les éruptions fébriles), les propositions de réponses (B, C, D, E) et le bouton de validation étaient rognés en bas de l'écran.
- Le défilement vertical était totalement bloqué en raison de contraintes CSS strictes (`overflow: hidden` sur `body` et `.app-container`, `height: 100%` sans `overflow-y: auto`, et `justifyContent: center` sur `BattleCard` provoquant un débordement tronqué en haut et en bas).

#### Correctifs apportés
1. **Conteneur Principal (`client/src/index.css` & `client/src/App.jsx`)** :
   - Ajout de la classe utilitaire `.pedia-scroll-viewport` activée dynamiquement dès que `session?.gameType === 'pedia'`.
   - Activation d'`overflow-y: auto !important`, `height: 100vh`, `-webkit-overflow-scrolling: touch` et `scroll-behavior: smooth`.
   - Intégration d'une barre de défilement (scrollbar) personnalisée cyan/sombre ultra-fine et discrète.
2. **Composant Conteneur de Carte (`client/src/components/BattleCard.jsx`)** :
   - Ajout du mode `mode="pedia"`.
   - Alignement haut (`justifyContent: 'flex-start'`) au lieu de `center`, éliminant le bug de centrage vertical qui coupait le haut et le bas du contenu.
   - Élargissement à `maxWidth: 880px` (au lieu de 600px) pour un confort de lecture optimal des vignettes cliniques.
   - En-tête de carte collant (`position: sticky`, `top: 0`, fond flouté semi-transparent) : le chronomètre dégressif, le score et l'avancement restent toujours visibles et épinglés en haut pendant que l'étudiant fait défiler le cas clinique.
   - Marge basse et padding (`paddingBottom: 4rem`) pour assurer un dégagement complet avant le bas d'écran.
3. **Moteur d'Écran de Jeu (`client/src/components/Game.jsx`)** :
   - Passage de `mode={isPedia ? 'pedia' : 'classic'}` au composant `BattleCard`.
   - Adaptation du conteneur parent (`maxWidth: 940px`, `height: isPedia ? 'auto' : '100%'`, `minHeight: '100%'`).
   - Fixation des boutons flottants d'actions (Pause et Chat rapide en haut à gauche et à droite) en `position: 'fixed'` en mode pédiatrie pour rester toujours accessibles à l'écran lors du défilement.
4. **Composant Question Médicale (`client/src/components/pedia/PediaArenaCard.jsx`)** :
   - Ajout d'un padding inférieur (`paddingBottom: '2.5rem'`) assurant un clic aisé sur le bouton "VALIDER" sans accolement au bord d'écran.
5. **Modal de Débriefing (`client/src/components/pedia/PediaReviewModal.jsx`)** :
   - Remplacement de `justifyContent: 'center'` par `justifyContent: 'flex-start'` avec `margin: 'auto'` sur la carte modale pour garantir l'accessibilité du haut de modal sur les résolutions compactes.

---

### 2026-10-24 22:06 — Correction de l'Écran de Débriefing & Explications Médicales (PediaReviewModal)

#### Problème identifié
- Après la fin d'une question médicale, l'écran d'explication et de débriefing de 60s apparaissait écrasé en une fine bande horizontale tronquée de ~40px tout en haut de la carte de combat, avec un écran noir vide en dessous.
- **Cause racine** : `PediaReviewModal` était imbriqué comme enfant direct de `BattleCard`. La propriété `backdrop-filter: blur(16px)` de `BattleCard` créait un nouveau contexte d'empilement (*containing block*) qui emprisonnait le `position: fixed` du modal à l'intérieur de la carte, pendant que le conteneur flex sans hauteur fixe s'effondrait sur la hauteur minimale de son en-tête.

#### Correctifs apportés
1. **Extraction de `BattleCard` dans le Moteur de Jeu (`client/src/components/Game.jsx`)** :
   - Dès que `isPedia && roundResult` est actif, `BattleCard` n'est plus du tout rendu (ce qui élimine le cadre bleu vide et l'en-tête résiduel du round précédent).
   - `PediaReviewModal` est désormais rendu directement comme vue principale de débriefing de niveau supérieur.
   - Sécurisation des données transmises : utilisation de `debriefQuestion={debriefQuestion || roundResult?.debriefQuestion}` pour éliminer tout clignotement ou écran vide lors du changement d'état.
2. **Architecture par Portail React (`client/src/components/pedia/PediaReviewModal.jsx`)** :
   - Encapsulation du composant avec `createPortal(..., document.body)` : le modal s'attache directement à la racine du document, s'affranchissant à 100% de tout style CSS parent (`filter`, `overflow`, etc.).
   - Dimensionnement plein écran propre (`height: 92vh`, `maxHeight: 92vh`, `maxWidth: 980px`, bordure néon cyan et ombre portée 3D).
3. **Enrichissement Pédagogique & Fonctionnel du Débriefing** :
   - **Rappel du Cas Clinique** : Affichage systématique de la vignette clinique complète au-dessus de l'énoncé si la question est un cas clinique (`is_cas_clinique`).
   - **Badges de Statuts Avancés** : Analyse proposition par proposition avec distinction entre les choix du joueur (vert si juste, rouge si faux), les omissions de bonnes réponses (vert pointillé) et l'affichage du choix de l'adversaire (`👤 Adversaire`).
   - **Chat Débriefing en Direct Amélioré** : Intégration de 5 boutons de réactions rapides en 1 clic (`💡 Bravo !`, `😅 Pas évident`, `🏥 Cas typique`, `👏 Bien joué`, `🤔 Piège !`) couplés au champ de saisie personnalisé.
   - **Grille Responsive (`client/src/index.css`)** : Ajout des classes `.pedia-review-overlay`, `.pedia-review-dialog` et `.pedia-review-grid` assurant 2 colonnes sur écran large (explications + chat) et bascule automatique en 1 colonne sur mobile.

---

### 2026-10-24 22:15 — Ajout de l'Option de Prolongation du Temps de Débriefing (+1 min par vote mutuel)

#### Contexte & Besoin
- Pendant la phase de débriefing de 60s entre les questions en arène médicale, les étudiants et médecins ont souvent besoin de plus de temps pour analyser un cas clinique complexe, relire les propositions ou échanger sur le chat.
- Ajout d'une fonctionnalité permettant d'ajouter **+1 minute (60 secondes)** au chronomètre autant de fois que souhaité, avec la règle métier stricte : **les 2 joueurs doivent voter pour valider l'ajout** (en solo, 1 clic suffit).

#### Modifications apportées
1. **Logique Serveur Temps Réel (`server/index.js`)** :
   - Événement socket `vote_extend_debrief_time` : gestion des votes par session avec ensemble `session.extendTimeVotes`.
   - Règle de consensus : si `votesCount >= totalPlayers`, ajout de +60 000 ms à `session.resultEndTime` et `session.resultDuration`, réarmement du minuteur `session.autoAdvanceTimer`, réinitialisation des votes pour permettre de ré-étendre si besoin, et réinitialisation de `session.readyPlayers` pour éviter tout saut intempestif.
   - Émission des événements `debrief_extend_votes` (diffusion du nombre de votes en attente) et `debrief_time_extended` (notification de la prolongation validée avec le nouveau temps restant).
2. **Gestionnaire Frontend (`client/src/components/Game.jsx`)** :
   - États réactifs `extendVotes` (`count`, `total`, `voters`) et `extendedRemainingSeconds`.
   - Écouteurs socket `debrief_extend_votes` et `debrief_time_extended` avec toast de succès (`⏱️ +1 minute ajoutée au débriefing !`) et notification sonore.
   - Transmission des props et de l'action `handleVoteExtendDebriefTime` à `PediaReviewModal`.
3. **Interface Utilisateur du Débriefing (`client/src/components/pedia/PediaReviewModal.jsx`)** :
   - Bouton d'action interactif `⏱️ +1 min` intégré dans l'en-tête à côté du chronomètre :
     - Si aucun vote : `⏱️ +1 min (0/2)` (neutre).
     - Si le joueur a voté : `⏱️ En attente (1/2)` (fond doré ambré).
     - Si l'adversaire a voté en premier : `⏱️ Accepter +1 min ! (1/2)` avec effet de lueur dorée incitative pour faciliter le consensus rapide.
     - En solo : `⏱️ +1 min` avec application instantanée.
   - Synchronisation automatique du chronomètre `timeLeft` dès réception de la prolongation serveur.
---

### 2026-10-24 23:10 — Ajout du Bouton de Prolongation +3 min aux côtés du Bouton +1 min

#### Contexte & Besoin
- L'utilisateur a demandé d'ajouter un bouton permettant d'ajouter **3 minutes (+180s)** directement à côté du bouton existant de **1 minute** dans le menu d'explication et de débriefing.
- Cette option permet aux joueurs d'avoir suffisamment de temps pour étudier des explications détaillées ou de longs cas cliniques sans devoir voter 3 fois de suite pour +1 min.

#### Modifications apportées
1. **Logique Serveur Multi-Durées (`server/index.js`)** :
   - Mise à niveau du gestionnaire `vote_extend_debrief_time` pour accepter un objet `{ sessionId, minutes: 1 | 3 }` (avec rétrocompatibilité si un string ou aucune durée n'est fourni).
   - Suivi distinct des votes par durée via `session.extendVotes = { 1: new Set(), 3: new Set() }`.
   - Règle d'exclusivité par joueur : un joueur vote soit pour +1 min soit pour +3 min (le clic sur l'autre durée bascule son vote ; un nouveau clic sur la même durée annule son vote).
   - Détection de consensus : dès que l'un des deux choix atteint le nombre total de joueurs requis (`votes1mCount >= totalPlayers` ou `votes3mCount >= totalPlayers`), le temps correspondant (+60s ou +180s) est ajouté immédiatement à `session.resultEndTime` et `session.resultDuration`.
   - Émission de `debrief_time_extended` avec `{ addedMinutes, addedSeconds, remainingSeconds }` et `debrief_extend_votes` avec les détails de chaque durée (`votes1m`, `votes3m`).
2. **Gestionnaire Frontend (`client/src/components/Game.jsx`)** :
   - Adaptation du state `extendVotes` pour suivre `votes1m: { count, voters }` et `votes3m: { count, voters }`.
   - Notification Toast dynamique précisant le nombre exact de minutes ajoutées (`⏱️ +1 minute ajoutée` ou `⏱️ +3 minutes ajoutées`).
   - Méthode `handleVoteExtendDebriefTime(minutes)` acceptant la durée sélectionnée (1 ou 3) et transmission des props `extendVotes1m` et `extendVotes3m` au composant `PediaReviewModal`.
3. **Interface Utilisateur du Débriefing (`client/src/components/pedia/PediaReviewModal.jsx`)** :
   - Intégration harmonieuse des deux boutons côte à côte dans la barre d'en-tête du modal :
     - **Bouton `+1 min`** : Identité ambre/dorée avec icône chronomètre (`⏱️`), états réactifs `En attente (1/2)` et `Accepter +1 min ! (1/2)`.
     - **Bouton `+3 min`** : Identité violette/lilas avec icône sablier (`⏳`), états réactifs `En attente (1/2)` et `Accepter +3 min ! (1/2)`.
   - En mode solo, les deux boutons affichent sobrement `+1 min` et `+3 min` avec effet immédiat au clic.

---

### 2026-10-24 23:20 — Intégration de l'IA d'Explication Médicale Approfondie & du Tuteur IA dans le Chat (/ia et bouton cochable)

#### Contexte & Besoin
- L'utilisateur a demandé d'intégrer dans le menu d'explication le moteur d'IA d'explication issu de `qcm-p-diatrie`, ainsi que l'activation du Tuteur IA dans le chat de débriefing en direct lorsque l'utilisateur tape `/ia` ou coche un bouton dédié.

#### Modifications apportées
1. **Service Client Gemini Flash (`client/src/services/geminiService.js`)** :
   - Transposition complète du moteur `qcm-p-diatrie/src/services/gemini.js` avec cascade de résilience 100% Flash (`gemini-3-flash-preview`, `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, etc.).
   - Nettoyeur LaTeX médical `cleanLatexMath` pour convertir automatiquement les balises mathématiques cryptiques en texte clair (unités, indices, exposants, symboles médicaux).
   - Méthode `generateReasoningNote(question, selectedLetters, isCroq, studentCroq)` générant l'analyse clinique structurée complète en 4 piliers.
   - Méthode `askAboutQuestion(question, conversationHistory, userMessage)` agissant comme tuteur conversationnel en contexte de la question en cours.
2. **Explication Clinique Structurée en 4 Cartes (`client/src/components/pedia/PediaReviewModal.jsx`)** :
   - Ajout d'une section dédiée sous l'explication officielle de cours : `🤖 Explication & Raisonnement Clinique IA`.
   - Bouton d'action interactif `✨ Analyser par IA` et `🔄 Réanalyser` avec retour visuel animé (`Gemini Flash analyse le cas clinique...`).
   - Découpage et affichage automatique en 4 cartes visuelles distinctes aux couleurs médicales :
     - 🎯 **Piège Clinique & Analyse de l'Erreur** (rose/ambre)
     - 📋 **Justification Proposition par Proposition** (violet/indigo)
     - 🩺 **Démarche Clinique & Raisonnement** (cyan/bleu)
     - 💡 **Règle d'Or & Mémo Concours** (émeraude/or)
3. **Tuteur IA Intégré au Chat en Direct (`/ia` & Bouton Cochable)** :
   - Bouton cochable `[🤖 Tuteur IA]` avec état actif lumineux au-dessus du champ de saisie du chat.
   - Détection intelligente de la commande `/ia` ou `/ai` dans le message ou de l'état coché du bouton.
   - Bulle d'attente animée avec 3 points rebondissants (`typing-indicator`) pendant la réflexion du tuteur.
   - Les réponses du Tuteur IA sont formatées en cartes néon cyan/violettes avec badge du modèle utilisé et diffusées en temps réel via Socket.IO à tous les participants de la session.
   - Ajout d'une réaction rapide en 1 clic : `🤖 Explique le piège !`.
4. **Prise en charge Serveur (`server/index.js` & `server/services/geminiServerService.js`)** :
   - Mise à niveau du gestionnaire `game_chat_message` pour supporter les messages avec drapeaux `isAi: true`, `modelUsed`, `senderName` et `senderAvatar`.
   - Ajout de `generateReasoningNote` et `askAboutQuestion` dans `GeminiServerService` côté serveur pour parité totale.
5. **Styles CSS Avancés (`client/src/index.css`)** :
   - Styles pour `.reasoning-cards-container`, `.reasoning-card`, `.card-trap`, `.card-options-analysis`, `.card-method`, `.card-rule`, `.reasoning-badge`, `.chat-bubble.bubble-ai`, `.typing-indicator` et `.btn-chat-ai-toggle`.
