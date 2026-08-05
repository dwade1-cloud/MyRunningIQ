import { auth, db } from "./firebase.js";
import { saveTutorialData } from "./tutorial-data.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// --------------------------------------------------
// Authentication
// --------------------------------------------------

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
});

// --------------------------------------------------
// Tutorial Elements
// --------------------------------------------------

const pages = document.querySelectorAll(".tutorial-page");
const progress = document.getElementById("progress-fill");
const stepText = document.getElementById("step-text");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

const birthday = document.getElementById("birthday");

birthday.min = "1920-01-01";
birthday.max = new Date().toISOString().split("T")[0];

let current = 0;

// --------------------------------------------------
// Validation
// --------------------------------------------------

function validateCurrentPage() {

    if (current === 0 || current === pages.length - 1) {
        nextBtn.disabled = false;
        return;
    }

    const activePage = pages[current];
    const requiredFields =
        activePage.querySelectorAll(".required-field");

    let valid = true;

    requiredFields.forEach(field => {

        let fieldValid = true;

        // Birthday validation
        if (field.id === "birthday") {

            if (
                !field.validity.valid ||
                field.value < birthday.min ||
                field.value > birthday.max
            ) {
                field.classList.add("invalid");
                valid = false;
                return;
            }
        }

        // Select validation
        if (field.tagName === "SELECT") {
            fieldValid = field.value !== "";
        } else {
            fieldValid = field.checkValidity();
        }

        if (field.value.trim() === "") {

            field.classList.remove("invalid");
            valid = false;

        } else if (fieldValid) {

            field.classList.remove("invalid");

        } else {

            field.classList.add("invalid");
            valid = false;

        }

    });

    nextBtn.disabled = !valid;

}

// --------------------------------------------------
// Helper Functions
// --------------------------------------------------

function limitNumber(input, maxDigits, maxValue) {

    if (input.value.length > maxDigits) {
        input.value =
            input.value.slice(0, maxDigits);
    }

    if (Number(input.value) > maxValue) {
        input.value = maxValue;
    }

}

function onlyWholeNumbers(event) {

    if (["e", "E", "+", "-", "."].includes(event.key)) {
        event.preventDefault();
    }

}

function validateName(input) {

    input.value =
        input.value
            .replace(/[^a-zA-Z ]/g, "")
            .replace(/\s{2,}/g, " ")
            .slice(0, 30);

}

// --------------------------------------------------
// Page Updates
// --------------------------------------------------

function updateTutorial() {

    pages.forEach(page =>
        page.classList.remove("active")
    );

    pages[current].classList.add("active");

    progress.style.width =
        ((current + 1) / pages.length) * 100 + "%";

    stepText.textContent =
        `Step ${current + 1} of ${pages.length}`;

    backBtn.style.visibility =
        current === 0
            ? "hidden"
            : "visible";

    nextBtn.textContent =
        current === pages.length - 1
            ? "Finish Setup"
            : "Next →";

    validateCurrentPage();

}

// --------------------------------------------------
// Required Field Listeners
// --------------------------------------------------

document.querySelectorAll(".required-field").forEach(field => {

    field.addEventListener(
        "input",
        validateCurrentPage
    );

    field.addEventListener(
        "change",
        validateCurrentPage
    );

});

// --------------------------------------------------
// Navigation
// --------------------------------------------------

nextBtn.addEventListener("click", async () => {

    if (current < pages.length - 1) {

        current++;
        updateTutorial();
        return;

    }

    await saveTutorialData();

    window.location.href = "dashboard.html";

});

backBtn.addEventListener("click", () => {

    if (current > 0) {

        current--;
        updateTutorial();

    }

});

// --------------------------------------------------
// Initialize
// --------------------------------------------------

updateTutorial();