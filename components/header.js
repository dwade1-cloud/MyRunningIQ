import { auth } from "../js/firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

export function initializeHeader() {

    /* ACCOUNT DROPDOWN */

    const accountButton =
        document.getElementById("account-menu-button");

    const accountDropdown =
        document.getElementById("account-dropdown");

    if (accountButton && accountDropdown) {

        accountButton.addEventListener("click", (event) => {
            event.stopPropagation();
            accountDropdown.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            accountDropdown.classList.remove("open");
        });

        accountDropdown.addEventListener("click", (event) => {
            event.stopPropagation();
        });

    }

    /* SIGN OUT */

    const signOutButton =
        document.getElementById("sign-out-button");

    if (signOutButton) {

        signOutButton.addEventListener("click", async () => {

            try {

                await signOut(auth);

                window.location.href = "login.html";

            } catch (error) {

                console.error(error);
                alert("Unable to sign out.");

            }

        });

    }

    /* ACTIVE PAGE */

    const currentPage =
        window.location.pathname.split("/").pop();

    document
        .querySelectorAll(".topbar-link")
        .forEach(link => {

            link.classList.remove("active");

            if (link.getAttribute("href") === currentPage) {
                link.classList.add("active");
            }

        });

}