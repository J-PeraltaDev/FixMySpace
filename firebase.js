// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNmxDPPDyTJN4UxrQ28fzvsIG-QR8ZY88",
    authDomain: "fixmyspace-a6a0f.firebaseapp.com",
    projectId: "fixmyspace-a6a0f",
    storageBucket: "fixmyspace-a6a0f.firebasestorage.app",
    messagingSenderId: "215565790436",
    appId: "1:215565790436:web:50cf0380772563ec1d10f1"
};

// Initialize Firebase
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
