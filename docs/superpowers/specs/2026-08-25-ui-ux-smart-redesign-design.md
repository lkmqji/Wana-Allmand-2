# Spécification de Conception — Refonte UI/UX Cyber-Gamifiée (Architecture Royale & Expérience Intelligente)

**Date :** 2026-08-25  
**Statut :** Validé par l'utilisateur  
**Auteur :** Antigravity AI  

---

## 1. Objectif du Projet
Transformer l'onglet principal **"Apprendre"** de Wana Allmand en un **Hub central gamifié ultra-engageant**, inspiré de la psychologie visuelle et de la boucle de rétention de *Clash Royale*, tout en conservant l'élégance Cyber-EdTech & Modern Glass (verre dépoli, néons doux, typographie *Outfit*, réactivité tactile).

---

## 2. Les 5 Zones Psychologiques du Hub "Apprendre"

```
┌────────────────────────────────────────────────────────┐
│ [Niv. 14 ★] [━━━━━ XP ━━━━━]       [🔥 7 Jours] [💎 450]│  <-- 1. HEADER (Statut & Devises)
├────────────────────────────────────────────────────────┤
│ [Avatar Google]  SuperWana                  [🔔¹] [☰]  │  <-- 2. PROFIL & SOCIAL
│  Ligue B1 - Pas de guilde       [Pass Deutsch: 7/20 🎁] │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  ╭──────────────────╮      [⚡ Défi IA] │
│                  │  🎁 RÉCUPÉRER   │      [🏆 Ligue B1]│  <-- 3. CENTRE ABSOLU (Arène 3D)
│                  │ Coffre de Mots ! │      [⭐ Bonus x2]│
│                  ╰─────────┬────────╯                  │
│                      [ ARÈNE B1 ]                      │
│                (Alexanderplatz Glow)                   │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [ 🎯 Solo ]   [ ⚔️ 1v1 PvP ]   [ 🧠 IA Boss ]   [ ⚡ Rev ]│  <-- 4. ZONE DE PRÉPARATION
├────────────────────────────────────────────────────────┤
│  ┌──────────┐  ╔══════════════════════╗  ┌──────────┐  │
│  │ 🗂️ LISTE │  ║    ⚔️  JOUER !       ║  │ 👥 SALON │  │  <-- 5. CALL-TO-ACTION (Gros Bouton)
│  │ A1 Verbes│  ║   (XP x2 Actif)      ║  │  En direct│  │
│  └──────────┘  ╚══════════════════════╝  └──────────┘  │
├────────────────────────────────────────────────────────┤
│  [ 🛒 Shop ]  [ 🗂️ Listes ]  [ ⚔️ Apprendre ]  [ 🏆 Rank ] │  <-- BOTTOM NAV
└────────────────────────────────────────────────────────┘
```

### Zone 1 : Le Header (Statut, Flammes & Ressources)
* **Visualisation :**
  * À gauche : Badge Niveau circulaire (`Niv. 14 ★`) et barre de progression dynamique d'XP.
  * À droite : Flammes 🔥 (`Streak` de jours consécutifs avec micro-pulsation) + Gemmes de savoir 💎 / Pièces d'or.
* **Rôle UX :** Statut et reconnaissance immédiate. Le joueur voit sa constance et sa richesse d'apprentissage.

### Zone 2 : Le Profil & Le Pass Deutsch (Zone Sociale & Urgence)
* **Visualisation :**
  * À gauche : Avatar Google dans un cadre lumineux (couleur de la ligue), pseudo, titre et ligue actuelle (*ex: "Ligue B1 - Explorateur"*).
  * À droite : Cloche de notifications 🔔 avec pastille rouge 🔴 (*nouvelle quête, ami en ligne, salon disponible*) + Menu burger ☰.
  * En dessous : Jauge d'avancement du **"Pass Deutsch"** (*ex: `7/20 Mots appris` avec coffre cadeau au bout*).
* **Rôle UX :** Identité du joueur et déclencheur d'urgence (les pastilles et jauges incitent au clic).

### Zone 3 : Le Centre Absolu (L'Arène de Ligue & Récompense Flottante)
* **Visualisation :**
  * **Illustration 3D / Diorama de l'Arène de Ligue** (A1 : Neuschwanstein, A2 : Forêt Noire, B1 : Alexanderplatz Cyber, B2 : Porte de Brandebourg, C1 : Sommet des Alpes) avec halo lumineux (*glow*).
  * **Bulle Récompense Flottante** : Coffre / Cadeau quotidien avec label `🎁 RÉCUPÉRER RÉCOMPENSE` animé (dopamine immédiate).
  * **Raccourcis Événements (côté droit)** :
    * ⚡ *Défi Quotidien IA* (badge avec chrono).
    * 🏆 *Progression de Ligue* (jalon vers la ligue supérieure).
    * ⭐ *Multiplicateur XP x2* actif.
* **Rôle UX :** Immersion contextuelle et récompense immédiate dès l'ouverture de l'application.

### Zone 4 : La Zone de Préparation (Sélecteurs de Modes & Rétention)
* **Visualisation :** 4 boutons de modes compacts en relief tactile avec icônes distinctes :
  1. 🎯 **Solo / Flash Quiz** (Entraînement rapide).
  2. ⚔️ **Duel 1v1 PvP** (Arène multijoueur temps réel).
  3. 🧠 **IA Boss / Tuteur** (Explications & mémorisation).
  4. ⚡ **Mode Vengeance** (Session ciblée sur les erreurs passées).
* **Rôle UX :** Clarté des options d'entraînement et accès direct aux styles de jeu.

### Zone 5 : Le Call-to-Action Suprême (Le Gros Bouton "JOUER")
* **Visualisation :**
  * **Centre :** ÉNORME bouton 3D doré/vert `⚔️ JOUER !` avec ombre physique, effet de brillance (*shimmer*) et sous-titre dynamique (*ex: "XP x2 Actif"* ou *"Prêt au combat"*).
  * **Gauche :** Bouton sélecteur de liste active 🗂️ avec vignette et nom de la liste active (*ex: "A1 - Verbes Forts"*). Un clic ouvre le sélecteur rapide de listes.
  * **Droite :** Bouton accès rapide aux salons multijoueurs ou défis spéciaux 👥 avec pastille d'activité.
* **Rôle UX :** Entonnoir d'action : l'attention converge à 100% vers le lancement immédiat d'une partie.

### Zone 6 : La Barre de Navigation Inférieure (Bottom Nav)
* 🛒 **Boutique** (Thèmes, avatars, badges).
* 🗂️ **Listes** (Création, import PDF/OCR, gestion complète des paquets de mots).
* ⚔️ **Apprendre** (Hub central Royale — Onglet principal).
* 👥 **Amis / Guilde** (Gestion des duels, salons, amis).
* 🏆 **Classement / Profil** (Tableau des scores, statistiques détaillées).

---

## 3. Design System & Tokens Visuels (`index.css`)

### 3.1 Couleurs & Textures
* **Fond Principal :** `#0b0f19` avec gradients radiaux subtils (aura de l'arène).
* **Bouton Combat Doré :** Dégradé `linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)`, bordure 3D `box-shadow: 0 6px 0 #b45309, 0 12px 20px rgba(245, 158, 11, 0.4)`.
* **Arène Glow :** `box-shadow: 0 0 50px rgba(99, 102, 241, 0.25)`.
* **Effets Tactiles :** Transition fluide `cubic-bezier(0.34, 1.56, 0.64, 1)`, compression au clic (`active: translateY(4px)`).

---

## 4. Stratégie de Mise en Œuvre & Validation
1. Création/mise à jour du composant `Home.jsx` (ou composant dédié Hub Royale `LearnHub.jsx`) structuré selon ces 5 zones.
2. Intégration du sélecteur de liste rapide (modal/drawer pop-up au clic sur le bouton gauche).
3. Intégration du déclencheur direct du mode de jeu avec la liste sélectionnée au clic sur le gros bouton.
4. Validation de la réactivité sur mobile (viewport vertical 375px–430px) et desktop.
