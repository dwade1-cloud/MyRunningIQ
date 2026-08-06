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

    /* ACTIVE PAGE */

    const currentPage =
        window.location.pathname.split("/").pop();

    document
        .querySelectorAll(".topbar-link")
        .forEach(link => {

            if (link.getAttribute("href") === currentPage) {
                link.classList.add("active");
            }

        });

}