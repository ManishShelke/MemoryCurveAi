// ─────────────────────────────────────────────────────────────
// Firebase Configuration – MemoryCurve
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAIGuNJOrLocOr4vDMPRz7i1-_mmO0w9rw",
  authDomain: "memorycurve-675cd.firebaseapp.com",
  projectId: "memorycurve-675cd",
  storageBucket: "memorycurve-675cd.firebasestorage.app",
  messagingSenderId: "330740159761",
  appId: "1:330740159761:web:8d0caf0afd706b954868b0",
  measurementId: "G-LDY22PQZLE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
