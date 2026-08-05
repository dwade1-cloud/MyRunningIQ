import { auth } from "./firebase.js";
import { saveTutorialData } from "./tutorial-data.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

const connectButton = document.getElementById("connect-strava");

connectButton.addEventListener("click", async () => {

    await saveTutorialData();

    const clientId = "268391";

    const redirectUri = "http://127.0.0.1:8080/strava-callback.html";

    const scope = "read,activity:read_all";

    const url =
        `https://www.strava.com/oauth/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&approval_prompt=auto` +
        `&scope=${scope}`;

    window.location.href = url;

});