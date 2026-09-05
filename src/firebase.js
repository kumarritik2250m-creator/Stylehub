import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged 
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long-polling to prevent 10s timeout warnings in sandboxed environments
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  try {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (fallbackErr) {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;
export const auth = getAuth(app);

// Test connection gracefully without crashing on offline status
async function validateFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore running in resilient offline/local cache mode.");
    }
  }
}
validateFirestoreConnection();

// Ensure local persistence for session retention
try {
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn("Firebase Auth persistence notice:", e);
  });
} catch (e) {
  console.warn("setPersistence skipped:", e);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged 
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}





