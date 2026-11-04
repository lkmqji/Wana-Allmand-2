# 🚀 Wana Allmand 2.0 — Notes de Version (Release Notes)

Bienvenue dans la version majeure **Wana Allmand 2.0.0** (Build 2) ! Cette mise à jour apporte une refonte complète du multijoueur, l'intégration avancée du Tuteur IA & Raisonnement Clinique, ainsi qu'un système de mise à jour automatique intégré à l'application.

---

## 🌟 Nouveautés Majeures

### 1. 👥 Multijoueur Étendu de 2 à 10 Joueurs
- **Capacité de salon portée jusqu'à 10 joueurs simultanés** (contre 2 à 4 auparavant).
- **Affichage dynamique en grille / carrousel** adapté aux écrans mobiles et tablettes pour suivre les scores et états de tous les participants en temps réel.
- **Gestion optimisée des salles privées et publiques** avec synchronisation haute fréquence via Socket.IO.

### 2. 👑 Privilège Exécutif de l'Hôte & Double Prolongation (+1 min / +3 min)
- **Double choix de prolongation** lors de la phase de correction/débriefing :
  - `⏱️ +1 min` pour une lecture rapide des réponses.
  - `⏳ +3 min` pour un débriefing approfondi et les échanges avec le Tuteur IA.
- **Consensus dynamique pour les invités** : la prolongation est automatiquement validée dès que la majorité des joueurs présents vote (`Math.max(2, Math.floor(N / 2))`).
- **Privilège Exécutif de l'Hôte** : L'hôte de la partie peut valider instantanément la prolongation pour l'ensemble du salon sans attendre le vote des invités.

### 3. 🧠 Raisonnement Clinique IA en 4 Cartes Pédagogiques (Gemini Flash)
- Génération instantanée et structurée des explications médicales détaillées pour chaque question :
  1. 🔑 **Clé Diagnostique & Physiopathologie** : diagnostic principal, sémiologie pivot et mécanismes sous-jacents.
  2. ✅ **Justification des Bonnes Réponses** : analyse argumentée et sourcée de chaque proposition correcte.
  3. ⚠️ **Pièges & Distracteurs éliminés** : explications pointues sur les fausses pistes et erreurs fréquentes.
  4. 💡 **Perles Cliniques & Règle d'or** : moyen mnémotechnique, points d'attention aux ECN/résidanat et réflexe d'urgence.
- Nettoyage automatique des balises LaTeX brutes pour une lecture agréable et fluide sur smartphone.

### 4. 💬 Tuteur IA en Direct ("Discussion Pédagogique")
- Posez vos questions complémentaires en direct au Tuteur IA sur n'importe quel QCM lors du débriefing.
- Mémoire du contexte de la question et historique de chat interactif.

### 5. 🔄 Vérificateur Automatique de Mises à Jour GitHub
- **Contrôle automatique à chaque lancement** : L'application vérifie automatiquement auprès des GitHub Releases (`lkmqji/Wana-Allmand-2`) si une nouvelle version ou un nouvel APK est disponible.
- **Modale de mise à jour élégante** : Affiche la nouvelle version, la taille de l'APK, le journal des modifications et un bouton de téléchargement direct en un clic.
- **Contrôle manuel dans le Profil** : Bouton *« 🔄 Vérifier les mises à jour »* accessible à tout moment dans l'onglet Profil avec affichage de la version installée (`Wana Allmand v2.0`).

### 6. ⌨️ Clavier Virtuel WanaBoard 60/40 & Clavier Natif Android
- Ratio ergonomique 60/40 garantissant que le contenu de la question reste toujours visible et lisible sans défilement intempestif.
- Bascule en un clic dans les Préférences du Profil vers le clavier natif Android.

### 7. 🎨 Thèmes Graphiques & Immersion Audio
- 8 thèmes visuels soigneusement calibrés (Midnight, Sakura, Cyber Pink, Hacker, Glacier, Emerald, Sunset, Dracula).
- Synchronisation dynamique de la barre d'état Android (`@capacitor/status-bar`).
- Effets sonores procéduraux (SFX) et gestion distincte des volumes.

---

## 📦 Fichiers et Téléchargement
- **APK Android Debug / Direct Install** : `WanaAllmand.apk` (à la racine du dépôt GitHub).
- **Compatibilité Android** : Android 7.0+ (API 24 à 34+).
- **Tag Git** : `v2.0.0`

---
*Développé avec passion pour l'excellence de l'apprentissage médical et linguistique.*
