import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBrkyWhvKanLK1kgE0roZ3EeSiZhSWJqtE",
  authDomain: "milk-subscription-app.firebaseapp.com",
  projectId: "milk-subscription-app",
  storageBucket: "milk-subscription-app.firebasestorage.app",
  messagingSenderId: "295803708577",
  appId: "1:295803708577:web:5627fdfdcbe9917890fce0"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
