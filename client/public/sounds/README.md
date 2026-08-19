# Dossier des Effets Sonores (SFX) et Musique (BGM) - Wana Allmand

L'application intègre :
1. **Un lecteur BGM (Background Music)** en boucle pour le fichier `bgm-main.mp3`.
2. **Un SFX Manager Web Audio API** procédural qui génère instantanément et sans latence tous les sons de l'interface, du jeu, du chat et de la progression (avec possibilité de remplacer par des fichiers `.mp3`).

---

## 🎵 Musique de Fond (BGM)
Pour activer la musique d'ambiance du jeu :
- Placez votre musique au format MP3 directement ici : `public/sounds/bgm-main.mp3`
- Le lecteur la lira automatiquement en boucle à un volume doux (0.06 / 6%).
- Elle se coupera instantanément si l'utilisateur clique sur le bouton 🔇 (Muet).

---

## 🔊 Effets Sonores (SFX optionnels en MP3)
Si vous souhaitez remplacer les synthétiseurs procéduraux par vos propres fichiers `.mp3`, placez-les dans ce dossier avec les noms exacts suivants :

### 🖱️ Interface & Base
1. `hover.mp3` - Petit "tic" court de survol d'interface.
2. `click.mp3` - Clic / pop électronique tactile.
3. `success.mp3` - "Ding" positif de bonne réponse.
4. `error.mp3` - "Buzzer" sourd d'erreur ou de pénalité.
5. `explosion.mp3` - Son lourd d'impact et de sub-bass pour la purification de la Vengeance.
6. `alert.mp3` - Sonnerie d'alerte / joueur qui rejoint la partie.

### 💬 Social & Chat (Volume bas)
7. `message_sent.mp3` - Petit "Swoosh" aigu ascendant très léger.
8. `message_received.mp3` - "Blip" doux et clair style Discord/Messenger.
9. `notification.mp3` - Carillon très doux pour les Toasts globaux.
10. `reaction_burst.mp3` - Bruit pétillant / bulles pour la volée d'émojis Telegram.

### ⚔️ Duel & Gameplay (Volume moyen)
11. `countdown_tick.mp3` - "Bip" grave et court (pour le 3... 2... 1...).
12. `countdown_go.mp3` - "BEEP!" plus long et aigu (pour le GO!).
13. `time_warning.mp3` - Battement de cœur rapide / "Tic-Tac" angoissant (< 5 secondes).
14. `opponent_answered.mp3` - "Clac" sourd de pression quand l'adversaire valide sa réponse.
15. `freeze.mp3` - Bruit de verre brisé / vent glacial du pouvoir 🥶.

### 🏆 Progression & Résultats (Volume normal)
16. `victory.mp3` - Fanfare triomphale joyeuse (Gagnant).
17. `defeat.mp3` - Accord descendant triste/grave (Perdant).
18. `levelup.mp3` - Accord magistral majestueux (Palier XP / Niveau supérieur).
