# Historique 2026-09-26

## 20:20 - Ajout option Clavier Android dans les paramètres de jeu

- Ajouté un état React useNativeKeyboard dans Game.jsx, persisté dans localStorage sous la clé wana_use_native_keyboard.
- Ajouté un bouton toggle **?? Clavier Android** (On/Off) dans le menu vertical en jeu (entre Sons et le séparateur Quitter).
- Quand l'option est activée, le VirtualKeyboard intégré est supprimé du rendu, laissant le clavier natif Android s'afficher.
- Le choix est sauvegardé entre les sessions grâce à localStorage.

