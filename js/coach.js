import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const analyzeButton = document.getElementById("analyze-button");
const sendButton = document.getElementById("send-button");

const analysisCard = document.getElementById("analysis-card");
const analysisOutput = document.getElementById("analysis-output");

const chatHistory = document.getElementById("chat-history");
const coachInput = document.getElementById("coach-input");

let currentUser = null;

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

});



/* ==========================================
   ANALYZE TRAINING
========================================== */

analyzeButton.addEventListener("click", async () => {

    if (!currentUser) return;

    analyzeButton.disabled = true;
    analyzeButton.textContent = "Analyzing...";

    analysisCard.classList.remove("hidden");

    analysisOutput.innerHTML = `
        <p>🧠 Reading your training...</p>
    `;

    try {

        const idToken = await currentUser.getIdToken();

        const response = await fetch(
            "https://us-central1-myrunningiq.cloudfunctions.net/testAI",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.error);

        }

        analysisOutput.textContent = data.response;

    } catch (error) {

        analysisOutput.innerHTML = `
            <strong>Error</strong><br><br>
            ${error.message}
        `;

    }

    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze My Training";

});



/* ==========================================
   CHAT
========================================== */

sendButton.addEventListener("click", () => {

    const message = coachInput.value.trim();

    if (!message) return;

    addMessage(message, "user");

    coachInput.value = "";



    addMessage(
        "Chat functionality coming next...",
        "ai"
    );

});



/* ==========================================
   ADD CHAT BUBBLE
========================================== */

function addMessage(text, type) {

    const bubble = document.createElement("div");

    bubble.className = `chat-message ${type}`;

    bubble.textContent = text;

    chatHistory.appendChild(bubble);

    chatHistory.scrollTop = chatHistory.scrollHeight;

}