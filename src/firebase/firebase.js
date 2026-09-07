// src/firebase/firebase.js

import { initializeApp } from "firebase/app";

import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import {
  createAsyncStorage,
} from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCNxCgXt7SGUhXS-ExrI2R5R9cUF6nSdsU",
  authDomain: "ghee-sales.firebaseapp.com",
  projectId: "ghee-sales",
  storageBucket: "ghee-sales.firebasestorage.app",
  messagingSenderId: "330621126643",
  appId: "1:330621126643:web:7bcf15e2ae5c5a31a1b486",
};

const app = initializeApp(firebaseConfig);

// ============================================================
// FIREBASE AUTH
// ============================================================

let auth;

if (typeof window !== "undefined") {
  // Web
  auth = getAuth(app);
} else {
  // Android / iOS
  const appStorage = createAsyncStorage("app");

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(appStorage),
  });
}

export { auth };

export const db = getFirestore(app);

export default app;