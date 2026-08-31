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
import { Capacitor } from '@capacitor/core';

// Initialisation sécurisée de GoogleAuth
export const initGoogleAuth = () => {
  try {
    GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '954044665510-9quujc9e3ig0mis2ndvrkv50d0554ldu.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (e) {
    console.warn("GoogleAuth init notice:", e);
  }
};

// Auto-init au chargement
initGoogleAuth();

export const loginWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      initGoogleAuth();
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken || googleUser?.idToken;
      if (!idToken) {
        throw new Error("Aucun jeton d'authentification (idToken) reçu de Google.");
      }
      const credential = GoogleAuthProvider.credential(idToken);
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
  if (Capacitor.isNativePlatform()) {
    GoogleAuth.signOut().catch(console.error);
  }
  return signOut(auth);
};
export const deleteAccount = (user) => deleteUser(user);
export const updateUserProfile = (user, profile) => updateProfile(user, profile);
