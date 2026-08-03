const main =
    document.getElementById("dashboard-main");

const sidebar =
    document.getElementById("sidebar");

const toggle =
    document.getElementById("sidebar-toggle");

const desktopWidth = 1100;

function updateSidebar(){

    if(window.innerWidth > desktopWidth){

        sidebar.classList.remove("closed");
        sidebar.classList.remove("open");

        toggle.style.display="none";

        main.classList.remove("expanded");

        return;
    }

    toggle.style.display="flex";

    if(!sidebar.classList.contains("open")){

        sidebar.classList.add("closed");

        toggle.classList.add("closed");
        toggle.classList.remove("open");

        main.classList.add("expanded");

    }

}

toggle.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle("open");
        sidebar.classList.toggle("closed");

        toggle.classList.toggle("open");
        toggle.classList.toggle("closed");

        main.classList.toggle("expanded");
    }
);

window.addEventListener(
    "resize",
    updateSidebar
);

updateSidebar();