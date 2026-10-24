// Firebase Configuration
// Replace these values with your actual Firebase project configuration
// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBt2sQJo5EcfSoDSx6bngFVg27t9_iiOQ0",
  authDomain: "fir-p-s-c76fe.firebaseapp.com",
  databaseURL: "https://fir-p-s-c76fe-default-rtdb.firebaseio.com",
  projectId: "fir-p-s-c76fe",
  storageBucket: "fir-p-s-c76fe.firebasestorage.app",
  messagingSenderId: "475254775096",
  appId: "1:475254775096:web:47c910325358779728b5cd",
  measurementId: "G-9W275ZRZP7"
};



// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, push, remove, update, child } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google Provider for better mobile support
googleProvider.setCustomParameters({
  prompt: 'select_account',  // Force account selection
  display: 'popup'
});

// Owner whitelist - these accounts can open access.html and manage who is
// Admin/Staff. This list is intentionally hardcoded here (not in the
// database) so it can never be edited through the web UI itself.
const OWNER_EMAILS = [
  'dmchaudhari76@gmail.com',
  'instamine9@gmail.com'
];

// Fallback seed values - used only once, if the "authorizedUsers" database
// node is still empty, to migrate the previous hardcoded whitelist in.
// After that first migration, the live list in the database is authoritative.
const DEFAULT_ADMIN_EMAILS = [
  'dmchaudhari76@gmail.com',
  'instamine9@gmail.com'
];

const DEFAULT_STAFF_EMAILS = [
  'harshaddc89@gmail.com',
  'omkal456@gmail.com',
  'vdnikam19@gmail.com',
  'seema27101983@gmail.com'
];

// Export database functions and auth
export { database, ref, set, get, push, remove, update, child, auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, OWNER_EMAILS, DEFAULT_ADMIN_EMAILS, DEFAULT_STAFF_EMAILS };
