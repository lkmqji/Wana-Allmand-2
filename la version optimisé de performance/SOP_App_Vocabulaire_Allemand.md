# SOP — Application de compétition de vocabulaire allemand (live, 2 joueurs)

## 0. Hypothèse de départ (à confirmer)
Le PDF de vocabulaire contient un tableau à 2 colonnes :
- **Colonne A** : mot en français / anglais (la question)
- **Colonne B** : mot allemand + article (der/die/das) (la réponse attendue)

> ⚠️ Dans ta description tu mentionnais une colonne "arabe avec pronom". Je pars du principe qu'il s'agit d'une coquille pour "allemand avec article". Si le vocabulaire doit en réalité inclure une 3e langue (arabe comme aide/traduction), il faut le dire — ça change le modèle de données (section 7).

---

## 1. Analyse de l'idée

### Ce qui est clair
- Deux personnes jouent en même temps, en direct (pas chacun son tour en asynchrone).
- Une personne (toi) uploade un PDF de vocabulaire, l'app génère automatiquement l'exercice.
- La question posée = mot FR/EN, la réponse attendue = mot allemand.
- Le score final s'affiche à la fin de la session.
- Une faute d'orthographe légère ne doit pas invalider totalement la réponse, mais doit réduire les points (pas de 0, pas de score plein).

### Points à trancher avant de coder (décisions à prendre maintenant)

| # | Question | Option recommandée (par défaut) |
|---|----------|----------------------------------|
| 1 | Comment les 2 joueurs se connectent-ils à la même session ? | Code de session à 4-6 chiffres généré à l'upload, partagé oralement/par message |
| 2 | Les 2 joueurs voient-ils le même mot en même temps, ou des mots différents en parallèle ? | Même mot, en même temps (vraie compétition tête-à-tête) |
| 3 | Qui gagne un round : le plus rapide, le plus juste, ou un mix ? | Score = exactitude (avec pénalité fautes) × bonus de rapidité |
| 4 | Que se passe-t-il si un joueur ne répond pas dans le temps imparti ? | Timer par question (ex: 15s), 0 point si pas de réponse |
| 5 | L'article allemand (der/die/das) compte-t-il dans la correction ? | Oui, avec pénalité séparée s'il est faux (l'orthographe du mot peut être correcte mais l'article faux) |
| 6 | Ordre des questions : identique pour les 2 joueurs ou mélangé différemment ? | Identique, pour que ce soit comparable en direct |
| 7 | Rejouabilité : peut-on relancer avec le même PDF plus tard ? | Oui, le PDF parsé est sauvegardé comme "liste" réutilisable |

---

## 2. Objectif de l'application

Permettre à deux apprenants de langue de s'affronter en temps réel sur une liste de vocabulaire allemand qu'un des deux a préparée à partir d'un PDF, avec une notation tolérante aux petites fautes de frappe/orthographe, et un récapitulatif de score à la fin.

---

## 3. Rôles utilisateurs

- **Hôte** : uploade le PDF, crée la session, partage le code de session, lance le quiz.
- **Invité(e)** : rejoint la session via le code, participe au quiz.
- Les deux ont un rôle symétrique une fois la partie lancée (les deux répondent aux mêmes questions).

---

## 4. Parcours utilisateur (user journey)

1. **Hôte** ouvre l'app → écran "Créer une session"
2. **Hôte** uploade le fichier PDF de vocabulaire
3. L'app **extrait** le tableau (parsing PDF), affiche un **aperçu** de la liste extraite pour validation/correction manuelle
4. L'app **génère** un code de session (ex: `AB47`) et affiche un **lien/QR code** à partager
5. **Invité(e)** entre le code sur son appareil → rejoint la salle d'attente
6. **Hôte** voit que l'invité est connecté → clique sur "Démarrer"
7. Compte à rebours synchronisé (3, 2, 1...) → la question 1 s'affiche **en même temps** chez les deux
8. Chaque joueur tape sa réponse en allemand → soumission individuelle
9. Dès que le temps est écoulé (ou que les deux ont répondu), l'app affiche : bonne réponse, score de chacun pour ce round, score cumulé
10. Passage automatique à la question suivante (même séquence pour les 2)
11. À la fin de la liste → **écran de résultats final** : score total, comparaison, éventuellement détail question par question
12. Option "Rejouer" (même liste, mélangée) ou "Nouvelle liste"

---

## 5. Spécifications fonctionnelles détaillées

### 5.1 Upload & extraction du PDF
- Accepter uniquement `.pdf`
- Extraire le tableau ligne par ligne (colonne A = FR/EN, colonne B = allemand + article)
- Nettoyer les données (espaces, casse, caractères spéciaux allemands ä/ö/ü/ß)
- Afficher un écran de **relecture** : l'hôte peut corriger une ligne mal extraite avant de valider
- Sauvegarder la liste validée en JSON (voir section 7)

### 5.2 Génération de l'exercice
- À partir de la liste validée, générer une **séquence de questions** (ordre aléatoire, mais identique pour les 2 joueurs dans une même session)
- Paramétrable : nombre de mots à inclure (tous, ou un sous-ensemble), durée par question

### 5.3 Session live multijoueur
- Nécessite une communication en temps réel entre les 2 clients (WebSocket ou service équivalent), pas un simple PDF/app statique
- États de la session : `en_attente` → `en_cours` → `terminée`
- Le serveur (ou un service temps réel) fait autorité sur : le mot courant, le timer, la réception des réponses, le calcul du score
- Les deux clients affichent la même question au même instant (synchronisation par le serveur, pas par le client)

### 5.4 Règles de notation
- Réponse **exacte** (mot + article corrects) → 100% des points du round
- Réponse avec **faute mineure** (1-2 caractères de différence, mesurée par distance de Levenshtein) → score réduit proportionnellement (ex: barème ci-dessous)
- Réponse avec **article faux mais mot correct** → petite pénalité fixe séparée
- Pas de réponse dans le temps imparti → 0 point
- Bonus optionnel de rapidité (répondre plus vite que l'adversaire donne un petit bonus, seulement si la réponse est correcte)

**Barème indicatif (sur 100 points par mot) :**

| Distance de Levenshtein | % du score |
|---|---|
| 0 (parfait) | 100% |
| 1 caractère | 75% |
| 2 caractères | 50% |
| 3 caractères ou mot trop différent | 0% (considéré faux) |

*(seuils ajustables selon la longueur du mot — une distance de 1 sur un mot de 4 lettres est plus grave que sur un mot de 12 lettres, donc idéalement on calcule un pourcentage relatif à la longueur du mot plutôt qu'un seuil absolu)*

### 5.5 Écran de résultats final
- Score total de chaque joueur
- Vainqueur mis en avant
- Détail optionnel : tableau mot par mot (réponse donnée vs attendue, points obtenus) pour réviser ensemble après coup
- Bouton "Rejouer" / "Nouvelle liste"

---

## 6. Architecture technique proposée

| Composant | Rôle | Suggestion |
|---|---|---|
| Frontend | Interface des 2 joueurs | App web responsive (mobile + desktop) |
| Temps réel | Synchronisation des questions/scores | WebSocket (ex: Socket.IO) ou service realtime managé (ex: Supabase Realtime, Firebase Realtime DB) |
| Backend léger | Logique de session, calcul des scores, autorité sur le timer | Serveur Node.js, ou fonctions serverless si on utilise Firebase/Supabase |
| Extraction PDF | Lire le tableau du PDF | Librairie de parsing PDF + détection de tableau (ex: pdfplumber côté Python, ou équivalent JS) |
| Correction orthographique | Comparer réponse vs attendu | Distance de Levenshtein (calcul simple, pas besoin d'IA) |
| Stockage | Sauvegarder les listes de vocabulaire réutilisables | Base de données légère (ex: Firestore, Supabase Postgres) |

> Pour un prototype rapide sans backend dédié, une solution type Firebase/Supabase (base de données temps réel + auth simple par code de session) permet d'éviter de gérer un serveur WebSocket soi-même.

---

## 7. Modèle de données (exemple JSON)

**Liste de vocabulaire (après extraction du PDF) :**
```json
{
  "liste_id": "vocab_2026_08_11",
  "nom": "Chapitre 3 - Maison",
  "mots": [
    { "id": 1, "source": "table (fr/en)", "allemand": "der Tisch" },
    { "id": 2, "source": "chair (fr/en)", "allemand": "der Stuhl" }
  ]
}
```

**Session live :**
```json
{
  "session_id": "AB47",
  "statut": "en_cours",
  "liste_id": "vocab_2026_08_11",
  "index_question_actuelle": 3,
  "joueurs": {
    "hote": { "nom": "Toi", "score_total": 240, "reponses": [] },
    "invite": { "nom": "Amie", "score_total": 210, "reponses": [] }
  }
}
```

**Réponse à une question :**
```json
{
  "question_id": 3,
  "joueur": "invite",
  "reponse_donnee": "der Tsch",
  "reponse_attendue": "der Tisch",
  "distance_levenshtein": 1,
  "points_obtenus": 75,
  "temps_reponse_sec": 4.2
}
```

---

## 8. MVP vs. évolutions futures

**MVP (version minimale à construire en premier) :**
- Upload PDF → extraction → relecture manuelle
- Session à 2 joueurs avec code de session
- Questions synchronisées, timer simple
- Score avec pénalité orthographique (Levenshtein)
- Écran de résultats final

**Évolutions possibles (v2+) :**
- Plus de 2 joueurs (mode tournoi/classement)
- Historique des sessions passées et progression dans le temps
- Mode révision (rejouer uniquement les mots ratés)
- Support de plusieurs listes de vocabulaire en parallèle
- Prononciation audio du mot allemand (text-to-speech)
- Application mobile native

---

## 9. Prochaine étape

1. Confirmer la structure réelle du PDF (section 0)
2. Choisir la stack technique (je recommande Firebase/Supabase pour aller vite sans gérer un serveur WebSocket toi-même)
3. Construire le MVP dans l'ordre : parsing PDF → génération session → sync live → scoring → résultats
