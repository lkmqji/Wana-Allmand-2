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

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export const deleteAccount = (user) => deleteUser(user);
export const updateUserProfile = (user, profile) => updateProfile(user, profile);

