import { initializeHeader } from "./header.js";

fetch("./components/header.html")
    .then(response => response.text())
    .then(html => {
        document.getElementById("header-container").innerHTML = html;
        initializeHeader();
    });

