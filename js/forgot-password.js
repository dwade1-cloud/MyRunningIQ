import { auth } from "./firebase.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form =
    document.getElementById("forgot-password-form");

const emailInput =
    document.getElementById("reset-email");

const message =
    document.getElementById("forgot-password-message");


function showMessage(text, type) {
    message.textContent = text;

    message.classList.remove(
        "error",
        "success"
    );

    message.classList.add(type);
}


form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email =
        emailInput.value.trim();

    if (!email) {
        showMessage(
            "Please enter your email address.",
            "error"
        );

        return;
    }

    try {
        await sendPasswordResetEmail(
            auth,
            email
        );

        showMessage(
            "Password reset email sent. Check your inbox.",
            "success"
        );

        emailInput.value = "";

    } catch (error) {
        console.error(
            "Password reset error:",
            error
        );

        let errorMessage =
            "Unable to send the reset email. Please try again.";

        if (error.code === "auth/invalid-email") {
            errorMessage =
                "Please enter a valid email address.";
        }

        if (error.code === "auth/too-many-requests") {
            errorMessage =
                "Too many attempts. Please wait a little while and try again.";
        }

        showMessage(
            errorMessage,
            "error"
        );
    }
});