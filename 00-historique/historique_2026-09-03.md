# Historique du 2026-09-03

- **[08:50]** Refonte de la création de Lobby (Duel Rapide) pour résoudre les problèmes de performance (lag). La boucle de concaténation de listes massives a été retirée du composant Home.jsx. La logique est désormais asynchrone côté serveur (server/index.js) qui interroge MongoDB et limite l'échantillon à 50 mots. Ajout de server/utils/exampleLists.js.
- **[09:14]** Optimisation des performances côté serveur (`server/index.js`) pour résoudre la saturation de RAM et les gels de l'Event Loop (lag > 100ms) :
  - Remplacement de `.find().reduce()` par le pipeline d'agrégation MongoDB natif (`$group`) pour calculer les statistiques sans charger les utilisateurs en mémoire.
  - Ajout d'une pagination (`skip`, `limit`) sur la route administrateur des utilisateurs.
  - Optimisation de la requête des notifications : remplacement d'une clause `$or` effectuant un tri bloquant en mémoire, par l'exécution de deux requêtes parallèles via `Promise.all` fusionnées et triées de manière optimisée côté Node.js.
- **[09:21]** Correction d'un bug de syntaxe ES Modules (export const) bloquant le dploiement Render dans server/utils/exampleLists.js. Remplacement par une exportation CommonJS (module.exports).
