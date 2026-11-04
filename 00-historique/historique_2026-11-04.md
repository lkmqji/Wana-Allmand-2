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
