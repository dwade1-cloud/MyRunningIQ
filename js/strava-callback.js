import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!code) {
        console.error("No Strava authorization code received.");
        return;
    }

    try {
        const idToken = await user.getIdToken();

        console.log(
            "User authenticated. Sending Strava code to backend."
        );

        const response = await fetch(
            "https://us-central1-myrunningiq.cloudfunctions.net/stravaCallback",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    code: code
                })
            }
        );

        const data = await response.json();

        console.log("Backend response:", data);

        if (!response.ok || !data.success) {
            console.error("Strava connection failed:", data);
            return;
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Backend error:", error);
    }
});