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
