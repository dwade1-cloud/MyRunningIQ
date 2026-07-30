// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {getFirestore} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAyjajEPw2YE3WFPfPW3O44iXlO8-q-gg",
  authDomain: "myrunningiq.firebaseapp.com",
  projectId: "myrunningiq",
  storageBucket: "myrunningiq.firebasestorage.app",
  messagingSenderId: "902735688169",
  appId: "1:902735688169:web:ec97c590fd113cc8295b78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
const auth = getAuth(app);
const db = getFirestore(app);

// Make auth available to other files
export { auth, db };