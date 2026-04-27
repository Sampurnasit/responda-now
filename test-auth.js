import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuth() {
  try {
    console.log("Attempting to create user...");
    const email = "test" + Date.now() + "@example.com";
    const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
    console.log("Successfully created user:", userCredential.user.uid);
    
    console.log("Attempting to create profile in firestore...");
    await setDoc(doc(db, "profiles", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        role: "user",
        onboarded: false,
        createdAt: new Date().toISOString()
    });
    console.log("Successfully created profile document!");
  } catch (error) {
    console.error("Firebase Error:", error.code || error.name, error.message);
  }
}

testAuth();

