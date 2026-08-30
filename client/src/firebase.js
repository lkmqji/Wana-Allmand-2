import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, deleteUser, setPersistence, browserLocalPersistence, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDvW7Gg7S5LHMErZNx3KO3_2fIPBRP_rXk",
  authDomain: "wana-allmand.firebaseapp.com",
  projectId: "wana-allmand",
  storageBucket: "wana-allmand.firebasestorage.app",
  messagingSenderId: "954044665510",
  appId: "1:954044665510:web:9c65e33eaecdbc3aebee67",
  measurementId: "G-HPV9K82EZE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const googleProvider = new GoogleAuthProvider();

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { signInWithCredential } from 'firebase/auth';

// Initialisation de GoogleAuth pour le web/pwa (remplacer par votre vrai Web Client ID)
GoogleAuth.initialize({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
});

export const loginWithGoogle = async () => {
  if (window.Capacitor?.isNative) {
    try {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      return await signInWithCredential(auth, credential);
    } catch (err) {
      console.error("Erreur de connexion native Google:", err);
      throw err;
    }
  } else {
    return signInWithPopup(auth, googleProvider);
  }
};

export const logout = () => {
  if (window.Capacitor?.isNative) {
    GoogleAuth.signOut().catch(console.error);
  }
  return signOut(auth);
};
export const deleteAccount = (user) => deleteUser(user);
export const updateUserProfile = (user, profile) => updateProfile(user, profile);
