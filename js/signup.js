import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form =
    document.getElementById("signup-form");

const errorMessage =
    document.getElementById("signup-error");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("show");
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearError();

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById(
            "confirm-password"
        ).value;

    const agreeTerms =
        document.getElementById("agreeTerms");

    if (!agreeTerms.checked) {
        showError(
            "You must agree to the Terms of Service " +
            "and Privacy Policy to create an account."
        );
        return;
    }

    if (password !== confirmPassword) {
        showError(
            "Passwords do not match."
        );
        return;
    }

    try {
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        window.location.href =
            "Tutorial.html";
    } catch (error) {
        console.error(
            "Signup error:",
            error
        );

        let message =
            "Unable to create your account. " +
            "Please try again.";

        if (
            error.code ===
            "auth/email-already-in-use"
        ) {
            message =
                "An account already exists " +
                "with this email.";
        } else if (
            error.code ===
            "auth/invalid-email"
        ) {
            message =
                "Please enter a valid email address.";
        } else if (
            error.code ===
            "auth/weak-password"
        ) {
            message =
                "Please choose a stronger password.";
        }

        showError(message);
    }
});