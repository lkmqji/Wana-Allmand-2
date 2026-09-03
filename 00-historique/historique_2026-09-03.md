# Historique du 2026-09-03

- **[08:50]** Refonte de la création de Lobby (Duel Rapide) pour résoudre les problèmes de performance (lag). La boucle de concaténation de listes massives a été retirée du composant Home.jsx. La logique est désormais asynchrone côté serveur (server/index.js) qui interroge MongoDB et limite l'échantillon à 50 mots. Ajout de server/utils/exampleLists.js.
- **[09:14]** Optimisation des performances côté serveur (`server/index.js`) pour résoudre la saturation de RAM et les gels de l'Event Loop (lag > 100ms) :
  - Remplacement de `.find().reduce()` par le pipeline d'agrégation MongoDB natif (`$group`) pour calculer les statistiques sans charger les utilisateurs en mémoire.
  - Ajout d'une pagination (`skip`, `limit`) sur la route administrateur des utilisateurs.
  - Optimisation de la requête des notifications : remplacement d'une clause `$or` effectuant un tri bloquant en mémoire, par l'exécution de deux requêtes parallèles via `Promise.all` fusionnées et triées de manière optimisée côté Node.js.
- **[09:21]** Correction d'un bug de syntaxe ES Modules (export const) bloquant le dploiement Render dans server/utils/exampleLists.js. Remplacement par une exportation CommonJS (module.exports).
- **[09:37]** Correction d'un bug majeur où le bouton "DUEL RAPIDE SOLO" ne réagissait plus (blocage silencieux complet) :
  - **Serveur (`server/index.js`)** : Ajout d'une vérification `mongoose.connection.readyState === 1` pour empêcher Mongoose de bloquer indéfiniment la requête de lobby aléatoire si MongoDB est injoignable.
  - **Client (`client/src/components/Home.jsx`)** : Ajout d'un timeout de 3 secondes lors de la création d'une session (`socket.connect()`) pour afficher un message d'alerte explicite si le serveur principal est hors ligne.

### 03/09/2026 10:50 - Optimisation de performance du composant Lobby
- Utilisation de useMemo dans Lobby.jsx pour �viter les calculs intensifs sur getAllDefaultWords � chaque rendu.
- Suppression d'un fetch r�seau redondant de publicLists lors de l'initialisation du Lobby qui encombrait inutilement la bande passante et le chargement initial.

### 03/09/2026 10:56 - Correction du probl�me de serveur hors ligne sur cold-start
- Suppression du timeout (d�lai) strict de 3 secondes dans \handlePlaySolo\ et ajout de la gestion de reconnexion dans \handleJoin\ (\Home.jsx\).
- Ces m�thodes attendent d�sormais ind�finiment l'�v�nement \connect\ si le socket n'est pas connect�, ce qui r�sout le probl�me de l'erreur 'Serveur hors ligne' lorsque le backend (Render/etc) est en veille et met 30 � 60s pour se rallumer.
