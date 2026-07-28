import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const agreeTerms = document.getElementById("agreeTerms");

    if (!agreeTerms.checked) {
        alert("You must agree to the Terms of Service and Privacy Policy to create an account.");
        return;
    }

    if(password !== confirmPassword){
        alert("Passwords do not match.");
        return;
    }

    try{

        await createUserWithEmailAndPassword(auth, email, password);

        alert("Account created successfully!");

        window.location.href = "Tutorial.html";

    }catch(error){

        alert(error.message);

    }

});