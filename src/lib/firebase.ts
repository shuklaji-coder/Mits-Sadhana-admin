import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCnxzHcHTeYgeKOjUHLNxe5Uez7EcCELTc",
  authDomain: "mitssadhanaappbackendfinal.firebaseapp.com",
  projectId: "mitssadhanaappbackendfinal",
  storageBucket: "mitssadhanaappbackendfinal.appspot.com",
  messagingSenderId: "779519469759",
  appId: "1:779519469759:web:008a0ad05cae7a76d93e0a",
  measurementId: "G-TTFZSJ6KY3"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
export default app;
