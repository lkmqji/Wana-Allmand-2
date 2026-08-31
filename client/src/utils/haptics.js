/**
 * Module universel de retour haptique (Android/iOS/Web).
 * Utilise navigator.vibrate avec repli silencieux si non supporté.
 */

export const triggerHaptic = (type = 'light') => {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'success':
          navigator.vibrate([20, 50, 20]);
          break;
        case 'error':
          navigator.vibrate([40, 60, 40, 60, 40]);
          break;
        case 'heavy':
          navigator.vibrate(60);
          break;
        default:
          navigator.vibrate(20);
      }
    }
  } catch (err) {
    // Ignorer silencieusement si les permissions de vibration sont restreintes
  }
};
