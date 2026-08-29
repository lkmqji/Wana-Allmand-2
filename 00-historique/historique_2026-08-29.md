# Historique des modifications - Wana Allmand

## Entrée : 2026-08-29 18:15:30 (UTC+01:00)
- Rédaction et formalisation du document exhaustif "Master Product & Technical Context" (Architecture technique, UX, Mécaniques métier, Audio, Résilience PWA/Socket, Thèmes et Arborescence des composants) destiné à la transmission aux équipes de développement et agents IA.

## Entrée : 2026-08-29 18:49:15 (UTC+01:00)
- Recherche et installation des compétences (skills) dans `.agents/skills/` :
  - `vercel-react-best-practices` & `react-vite-best-practices` : Profilage et optimisation des performances React/Vite (anti-ralentissement écran).
  - `memory-leak-detection` : Diagnostic et traçage des fuites de mémoire (WebSockets, Web Audio API, listeners et cycle de vie React).
## Entrée : 2026-08-29 19:01:45 (UTC+01:00)
- Optimisation majeure des performances frontend (ultra 'snappy' UI) selon les compétences `@vercel-react-best-practices`, `@react-vite-best-practices` et `@memory-leak-detection` :
  - **Saisie instantanée & Élimination des re-renders** :
    - Isolation du chronomètre dans des sous-composants mémoïsés (`GameTimerBadge` et `VengeanceTimerBar`) afin que les ticks à 10Hz ne déclenchent aucun re-rendu sur l'arbre de composants parent ni sur les champs de saisie.
    - Isolation du champ de saisie de texte (`GameInputForm`) avec son propre état local pour une frappe instantanée (0ms de latence, zéro saccade).
    - Stabilisation des écouteurs Socket.IO via `useRef` pour éviter la destruction et réinscription continue des 16 listeners d'événements à chaque réponse ou changement de question.
  - **Prévention des fuites de mémoire (UI & Audio)** :
    - Suppression de l'instanciation non gérée `new AudioContext()` dans `Game.jsx` au profit du gestionnaire singleton `sfxManager`.
    - Déconnexion systématique des nœuds Web Audio (oscillateurs, gains, filtres) à la fin de leur lecture (`onended`) et ajout de la méthode `dispose()`.
    - Stabilisation des écouteurs globaux de clics et raccourcis dans `AudioContext.jsx` avec des `useRef` pour éliminer l'accumulation d'écouteurs lors des réglages de volume.
    - Nettoyage rigoureux de tous les `setTimeout` et `setInterval` au démontage des composants, et arrêt automatique de `window.speechSynthesis` pour préserver les ressources sur les longues sessions.
  - **Performances CSS & Accélération matérielle (GPU)** :
    - Refonte des animations de secousse (`errorShake` et `shake`) avec `translate3d(x, 0, 0)`, `transform: translateZ(0)` et `will-change: transform`.
    - Accélération matérielle GPU pour les boutons 3D (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`) et les boîtes de jeu Glassmorphism (`.vengeance-game-box`, `.card`).
    - Animation de la jauge de temps de vengeance optimisée en GPU via `transform: scaleX(...)` pour éliminer les reflows/repaints layout à chaque dixième de seconde.

## Entrée : 2026-08-29 19:22:00 (UTC+01:00)
- **Correction du bug d'affichage dans le Mode Vengeance** :
  - Résolution de l'erreur d'exécution `timeLeft is not defined` dans [VengeanceMode.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx).
  - Suppression du reliquat `const timerPercent = (timeLeft / ROUND_DURATION) * 100;` devenu inutile depuis l'isolation du chronomètre dans le sous-composant `VengeanceTimerBar`.

## Entrée : 2026-08-29 19:31:30 (UTC+01:00)
- **Correction du reset du chronomètre à la frappe dans le Mode Vengeance** :
  - Découplage de la réinitialisation de `timeLeft` dans [VengeanceMode.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx) : le chronomètre ne se réinitialise désormais qu'au changement réel de mot (`currentWordKey`) ou au démarrage de la partie.
  - Stabilisation des fonctions de rappel (`onTimeout`, `playTimeWarning`) via `useRef` pour éviter la réexécution de l'intervalle lors des rendus.
  - Utilisation de `inputValRef` dans `handleTimeout` pour éliminer la dépendance directe à `inputVal` et garantir l'indépendance totale entre la saisie clavier et le décompte du temps.

## Entrée : 2026-08-29 19:39:15 (UTC+01:00)
- **Lancement des services locaux** :
  - Installation des dépendances du client (`client/node_modules`) et du serveur (`server/node_modules`).
  - Démarrage du serveur Backend Node.js / Express / Socket.IO sur le port `3001` (`http://localhost:3001`).
  - Démarrage du serveur de développement Frontend Vite sur le port `5174` (`http://localhost:5174/`).

## Entrée : 2026-08-29 19:40:00 (UTC+01:00)
- **Activation du bouton de commentaire Agentation réservée à l'administrateur** :
  - Déplacement de `<Agentation />` depuis [main.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/main.jsx) vers [App.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx).
  - Conditionnement de l'affichage d'`Agentation` exclusivement au statut administrateur (`isAdmin`) afin qu'il reste actif en tout temps (en mode production comme en mode développement) uniquement pour l'administrateur identifié, et masqué pour tous les autres utilisateurs.

## Entrée : 2026-08-29 19:45:00 (UTC+01:00)
- **Correctif d'affichage global et activation en 1 clic pour l'Administrateur** :
  - Restructuration du rendu principal dans [App.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/App.jsx) (`renderMainContent`) pour que le fragment racine monte `<Agentation />` en continu sur tous les écrans (Écran de connexion, TitleScreen, Vengeance, Duel, Dashboard).
  - Ajout du support de détection d'administrateur flexible (`VITE_ADMIN_UID` + `localStorage` override + helper console `window.enableAdmin()`).
  - Ajout d'une section dédiée "Espace Administrateur" dans l'onglet Profil ([Profil.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Profil.jsx)) permettant d'activer ou désactiver les privilèges administrateur et de voir l'état du bouton Agentation en temps réel.

## Entrée : 2026-08-29 19:58:00 (UTC+01:00)
- **Correction et réinitialisation du chronomètre à chaque manche (Game.jsx)** :
  - Ajout de la clé dynamique `key={round_${questionIndex}}` et de la prop `questionIndex` sur le composant isolé `GameTimerBadge` dans [Game.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx). Le chronomètre se réinitialise désormais immédiatement à 15s au début de chaque nouvelle manche même après être tombé à 0s.
- **Accessibilité du bouton "PRÊT ? GO !" en Mode Vengeance (VengeanceMode.jsx & index.css)** :
  - Ajustement du conteneur `.vengeance-arena` dans [index.css](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/index.css) avec `justify-content: flex-start` et padding compact adapté aux écrans d'ordinateurs portables (ex: hauteur 695px).
  - Réduction optimisée des espacements et des tailles de police dans la boîte de présentation d'introduction de [VengeanceMode.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx) afin que le bouton "PRÊT ? GO ! 🚀" soit immédiatement visible sans nécessiter de défilement vers le bas.
- **Ajout des boutons d'insertion rapide des 3 articles allemands (der, die, das)** :
  - Ajout de 3 boutons cliquables colorés (`der`, `die`, `das`) sous le champ de saisie dans [VengeanceMode.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx). Un clic insère ou remplace l'article actuel tout en conservant le focus sur le champ pour continuer à taper sans interruption.
- **Ajout des caractères spéciaux allemands les plus utilisés (ä, ö, ü, ß, Ä, Ö, Ü)** :
  - Ajout d'une barre de touches virtuelles tactiles pour insérer instantanément `ä`, `ö`, `ü`, `ß`, `Ä`, `Ö`, `Ü` à l'endroit précis du curseur dans [VengeanceMode.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/VengeanceMode.jsx).

## Entrée : 2026-08-29 20:08:00 (UTC+01:00)
- **Conservation exclusive des minuscules pour les caractères spéciaux (VengeanceMode.jsx)** :
  - Suppression des versions majuscules `Ä`, `Ö`, `Ü` dans la barre virtuelle du Mode Vengeance pour ne conserver que les caractères minuscules usuels : `ä`, `ö`, `ü`, `ß`.
- **Ajout des boutons rapides des pronoms/articles et caractères spéciaux dans la carte de Duel principale (Game.jsx)** :
  - Intégration de la barre de boutons rapides (`der`, `die`, `das` et `ä`, `ö`, `ü`, `ß`) directement sous le champ de saisie dans le composant [Game.jsx](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/src/components/Game.jsx) (`GameInputForm`). Un simple clic insère ou remplace l'article ou le caractère spécial tout en maintenant le focus actif pour une frappe ultra-rapide.

## Entrée : 2026-08-29 20:40:00 (UTC+01:00)
- **Annulation et retour à l'état initial du projet (Revert Android/Capacitor)** :
  - Suppression complète du dossier [client/android](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/android) et du fichier de configuration [client/capacitor.config.json](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/capacitor.config.json).
  - Désinstallation des dépendances Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) et restauration du fichier [client/package.json](file:///c:/Users/Lenovo/Documents/GitHub/Wana-Allmand-2/client/package.json).
  - Restauration de l'état propre initial du projet Web/PWA.


## Entrée : 2026-08-29 20:52:00 (UTC+01:00)
- **Renforcement de la résilience réseau (Mobile, 4G et Mise en veille)** :
  - Client (`App.jsx`) : Ajout d'une détection robuste des sorties de veille (`visibilitychange`, `focus`, `pageshow`) pour forcer la reconnexion automatique du socket via `socket.connect()` s'il a été déconnecté.
  - Serveur (`server/index.js`) : Augmentation de la tolérance aux micro-coupures réseau (4G/Tunnels) en ajustant le `pingInterval` à 25s et le `pingTimeout` à 60s.
  - Client (`useSocketEvent.js`) : Retrait de la condition bloquante (`typeof handler !== 'function'`) au montage du hook, permettant à l'écouteur d'être attaché même si le `handler` initial n'est pas encore défini.
  - Audit : Vérification complète de l'absence de fuites d'écouteurs "fantômes" `socket.on` dans `App.jsx` ; aucun nettoyage n'était manquant.

### 22:04 - Architecture R�seau Mobile Indestructible (Solutions 1, 2, 3, 4)
- Ajout d'une d�connexion proactive (socket.disconnect()) lorsque l'application passe en arri�re-plan pour �viter les sessions corrompues et les joueurs fant�mes.
- Ajout du rafra�chissement asynchrone du jeton Firebase (uth.currentUser.getIdToken(true)) avant de relancer la connexion au retour au premier plan.
- Cr�ation d'un heartbeat applicatif c�t� client (ping/pong toutes les 25s) pour d�tecter les micro-coupures et fermer manuellement la socket si 3 pings sont perdus.
- Ajout de l'�couteur ping_app c�t� serveur Express.
- Maintien de la correction du crash 'Cannot access A before initialization' en conservant les �tats au-dessus du useEffect.

### 22:20 - Fermeture imm�diate de session et retour accueil � la d�connexion d'un joueur
- Annulation de toutes les tentatives d'�couteurs de mise en veille / heartbeat applicatif / reconnexion complexe.
- Mise en place de la fermeture imm�diate : si un joueur quitte la partie ou le salon (ou se d�connecte), la session est instantan�ment supprim�e sur le serveur.
- �mission de l'�v�nement 'session_closed' � tous les participants.
- Redirection imm�diate des deux joueurs vers la page d'accueil (vue 'home') avec r�initialisation compl�te de l'�tat de la session.

### 22:28 - Notification explicite de fermeture du lobby
- Personnalisation du message de notification affich� au joueur restant lorsque l'autre joueur se d�connecte : 'Le lobby est ferm� � cause de la d�connexion de l'autre joueur'.
- �mission de la notification sous forme de toast d'alerte lors du retour automatique � l'accueil.
