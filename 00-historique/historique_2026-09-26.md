# Historique 2026-09-26

## 20:20 - Ajout option Clavier Android dans les paramètres de jeu

- Ajouté un état React useNativeKeyboard dans Game.jsx, persisté dans localStorage sous la clé wana_use_native_keyboard.
- Ajouté un bouton toggle **?? Clavier Android** (On/Off) dans le menu vertical en jeu (entre Sons et le séparateur Quitter).
- Quand l'option est activée, le VirtualKeyboard intégré est supprimé du rendu, laissant le clavier natif Android s'afficher.
- Le choix est sauvegardé entre les sessions grâce à localStorage.


## 20:28 - Clavier Android : option dans Profil & desactive par defaut

- Ajoute une carte **Preferences de Jeu** dans l'onglet **Compte** du profil (Profil.jsx), visible depuis la page d'accueil.
- Le toggle Switch anime (violet quand actif) controle l'affichage du VirtualKeyboard.
- **Desactive par defaut** : le clavier virtuel WanaBoard est maintenant masque par defaut sur les nouvelles installations (localStorage wana_use_native_keyboard !== 'false').
- La logique de default est synchronisee entre Profil.jsx et Game.jsx.


## 20:32 - Correction clavier Android natif : vrai input HTML

- **Probleme** : Quand le clavier virtuel WanaBoard etait masque, le clavier Android ne s'affichait pas car le fake-input (div) bloquait le clavier natif via inputMode=none.
- **Solution** : Ajout de la prop useNativeKeyboard dans BattleConsole.jsx. Quand true, rend un vrai <input> HTML au lieu du div fake-input.
- Ajout d'un override CSS input.fake-input pour corriger display et user-select incompatibles avec un element <input>.
- Passage de la prop useNativeKeyboard={useNativeKeyboard} depuis Game.jsx vers BattleConsole.


## 20:36 - Auto-focus clavier Android au changement de question

- Ajout d'un useEffect dans BattleConsole.jsx qui focus automatiquement l'input natif Android (80ms de delai pour le DOM).
- Le focus se declenche a chaque nouvelle question, au deblocage du champ (isDisabled passe a false), et au montage en mode natif.
- Plus besoin d'appuyer sur la zone de texte pour que le clavier s'affiche.

