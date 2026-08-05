import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
let currentUser = null;
let currentUserData = {};

/* ===========================
   ACCORDION
=========================== */

document.querySelectorAll(".account-card-header").forEach(header => {

    header.addEventListener("click", (event) => {

        if (
            event.target.closest(".account-header-actions")
        ) {
            return;
        }

        const card = header.closest(".account-card");

        card.classList.toggle("open");

    });

});

/* ===========================
   LOAD ACCOUNT
=========================== */

onAuthStateChanged(auth, async user => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    setText("email", user.email);

    const [userDoc, statisticsDoc, equipmentDoc] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "users", user.uid, "statistics", "summary")),
        getDoc(doc(db, "users", user.uid, "equipment", "summary"))
    ]);

    const userData =
        userDoc.exists()
            ? userDoc.data()
            : {};

    currentUser = user;
    currentUserData = userData;
    const statistics = statisticsDoc.exists() ? statisticsDoc.data() : {};
    const equipment = equipmentDoc.exists() ? equipmentDoc.data() : {};

    loadUser(userData);
    loadStatistics(statistics);
    loadEquipment(equipment);

});

/* ===========================
   HELPERS
=========================== */

function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "—"
            : value;

}

function formatMiles(miles) {

    if (miles === undefined || miles === null) return "—";

    return `${Number(miles).toFixed(1)} mi`;

}

function formatSeconds(seconds) {

    if (!seconds) return "—";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours} hr ${minutes} min`;

}

function calculateAge(birthday) {

    if (!birthday) return "—";

    const birth = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const monthDifference =
        today.getMonth() - birth.getMonth();

    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() < birth.getDate()
        )
    ) {
        age--;
    }

    return age;

}

function formatHeight(feet, inches) {

    if (
        feet === undefined ||
        inches === undefined ||
        feet === null ||
        inches === null
    ) {
        return "—";
    }

    return `${feet}'${inches}"`;

}

function calculateCompletion(data) {

    const fields = [
        "fullName",
        "birthday",
        "sex",
        "heightFeet",
        "heightInches",
        "weight",
        "yearsRunning",
        "primaryEvent",
        "vo2Max",
        "restingHeartRate",
        "injuryHistory"
    ];

    let completed = 0;

    fields.forEach(field => {
        if (data[field] !== undefined &&
            data[field] !== null &&
            data[field] !== "") {
            completed++;
        }
    });

    const percent =
        Math.round((completed / fields.length) * 100);

    setText("profile-percent", percent + "%");

    document.getElementById("profile-progress-bar").style.width =
        percent + "%";

}

function formatMemberSince(dateString) {
    if (!dateString) return "—";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });
}

function showValidationError(message) {
    alert(message);
}

/* ===========================
   USER DATA
=========================== */

function loadUser(data) {

    setText("full-name", data.fullName);
    setText("sex", data.sex);
    setText("age", calculateAge(data.birthday));
    setText("height", formatHeight(
            data.heightFeet,
            data.heightInches));
    setText("weight", data.weight);

    setText("years-running", data.yearsRunning);
    setText("primary-event", data.primaryEvent);

    setText("pr1", data.pr1);
    setText("pr2", data.pr2);

    setText("vo2-max", data.vo2Max);
    setText("resting-hr", data.restingHeartRate);
    setText("injury-history", data.injuryHistory);

    setText("member-since", formatMemberSince(data.memberSince));

    setText("weekStart", data.weekStart);

    setText(
        "preferred-long-run-day",
        data.preferredLongRunDay
    );

    setText(
        "preferred-workout-day",
        data.preferredWorkoutDay
    );

    setText(
        "preferred-rest-day",
        data.preferredRestDay
    );

    if (data.stravaConnected) {
        setText("strava-status", "✅ Connected");
    } else {
        setText("strava-status", "❌ Not Connected");
    }

    calculateCompletion(data);

}

/* ===========================
   STATISTICS
=========================== */

function loadStatistics(data) {

    setText(
        "current-weekly-mileage",
        formatMiles(data.lastCompletedWeekMileage)
    );

    setText(
        "highest-weekly-mileage",
        formatMiles(data.highestWeeklyMileage)
    );

    setText(
        "average-runs-week",
        data.averageRunsPerWeek8Weeks
    );

    setText(
        "average-weekly-mileage",
        formatMiles(data.averageWeeklyMileage8Weeks)
    );

    setText(
        "longest-run",
        formatMiles(data.longestRun)
    );

    setText(
        "activities",
        data.activityCount
    );

    setText(
        "lifetime-miles",
        formatMiles(data.lifetimeMiles)
    );

    setText(
        "total-running-time",
        formatSeconds(data.totalTimeRunningSeconds)
    );

    setText(
        "max-heart-rate",
        data.maxHeartRate
    );

}

/* ===========================
   EQUIPMENT
=========================== */

function loadEquipment(data) {

    setText("watch", data.watch);

    const shoeList =
        document.getElementById("shoe-list");

    if (!shoeList) return;

    shoeList.innerHTML = "";

    if (!data.shoes ||
        Object.keys(data.shoes).length === 0) {

        shoeList.innerHTML = `
            <div class="shoe-card">
                <p>No shoes imported from Strava.</p>
            </div>
        `;

        return;

    }

    const assignments =
        data.shoeAssignments || {};

    Object.values(data.shoes).forEach(shoe => {

        const type =
            assignments[shoe.id]?.type || "";

        const miles =
            ((shoe.distanceMeters || 0) * 0.000621371)
            .toFixed(1);

        const card =
            document.createElement("div");

        card.className = "shoe-card";

        card.innerHTML = `
            <h4>${shoe.name || "Unnamed Shoe"}</h4>

            <p>${shoe.brand || ""} ${shoe.model || ""}</p>

            <p>${miles} mi</p>

            <select class="shoe-type" data-id="${shoe.id}">
                <option value="" ${type===""?"selected":""}>Select Type</option>
                <option value="dailyTrainer" ${type==="dailyTrainer"?"selected":""}>Daily Trainer</option>
                <option value="longRun" ${type==="longRun"?"selected":""}>Long Run Shoe</option>
                <option value="workout" ${type==="workout"?"selected":""}>Workout Shoe</option>
                <option value="race" ${type==="race"?"selected":""}>Race Shoe</option>
                <option value="xcSpike" ${type==="xcSpike"?"selected":""}>XC Spike</option>
                <option value="trackSpike" ${type==="trackSpike"?"selected":""}>Track Spike</option>
                <option value="trail" ${type==="trail"?"selected":""}>Trail Shoe</option>
                <option value="other" ${type==="other"?"selected":""}>Other</option>
            </select>
        `;

        shoeList.appendChild(card);

    });

}

document
    .querySelectorAll(".account-edit-section")
    .forEach(button => {

        button.addEventListener("click", (event) => {

            event.stopPropagation();

            const section =
                button.dataset.section;

            document.getElementById(
                `${section}-view`
            ).style.display = "none";

            document.getElementById(
                `${section}-edit`
            ).style.display = "block";

            button.style.display = "none";

            button.nextElementSibling.style.display =
                "inline-block";

            button.nextElementSibling.nextElementSibling.style.display =
                "inline-block";

            populateSection(section);

        });

    });

function populateSection(section) {

    switch (section) {

        case "personal":

            document.getElementById("edit-full-name").value =
                currentUserData.fullName || "";

            document.getElementById("edit-email").value =
                auth.currentUser.email || "";

            document.getElementById("edit-birthday").value =
                currentUserData.birthday || "";

            document.getElementById("edit-sex").value =
                currentUserData.sex || "";

            document.getElementById("edit-height-feet").value =
                currentUserData.heightFeet || "";

            document.getElementById("edit-height-inches").value =
                currentUserData.heightInches || "";

            document.getElementById("edit-weight").value =
                currentUserData.weight || "";

            break;

        case "running":

            document.getElementById("edit-years-running").value =
                currentUserData.yearsRunning || "";

            document.getElementById("edit-primary-event").value =
                currentUserData.primaryEvent || "";

            break;

        case "goals":

            document.getElementById("edit-pr1").value =
                currentUserData.pr1 || "";

            document.getElementById("edit-pr2").value =
                currentUserData.pr2 || "";

            break;

        case "health":

            document.getElementById("edit-vo2-max").value =
                currentUserData.vo2Max || "";

            document.getElementById("edit-resting-hr").value =
                currentUserData.restingHeartRate || "";

            document.getElementById("edit-injury-history").value =
                currentUserData.injuryHistory || "";

            break;

        case "preferences":

            document.getElementById("edit-weekStart").value =
                currentUserData.weekStart || "";

            document.getElementById("edit-preferred-long-run-day").value =
                currentUserData.preferredLongRunDay || "";

            document.getElementById("edit-preferred-workout-day").value =
                currentUserData.preferredWorkoutDay || "";

            document.getElementById("edit-preferred-rest-day").value =
                currentUserData.preferredRestDay || "";

            break;

    }

}    

document
    .querySelectorAll(".account-cancel-section")
    .forEach(button => {

        button.addEventListener("click", (event) => {

            event.stopPropagation();

            const section =
                button.dataset.section;

            document.getElementById(
                `${section}-view`
            ).style.display = "block";

            document.getElementById(
                `${section}-edit`
            ).style.display = "none";

            button.style.display = "none";

            button.previousElementSibling.style.display =
                "none";

            button.previousElementSibling.previousElementSibling.style.display =
                "inline-block";

        });

    });

document
    .querySelectorAll(".account-save-section")
    .forEach(button => {

        button.addEventListener("click", async (event) => {

            event.stopPropagation();

            const section = button.dataset.section;

            let updates = {};

            switch (section) {

                case "personal":

                    updates = {
                        fullName:
                            document.getElementById("edit-full-name").value.trim(),

                        birthday:
                            document.getElementById("edit-birthday").value,

                        sex:
                            document.getElementById("edit-sex").value,

                        heightFeet:
                            Number(document.getElementById("edit-height-feet").value),

                        heightInches:
                            Number(document.getElementById("edit-height-inches").value),

                        weight:
                            document.getElementById("edit-weight").value === ""
                                ? null
                                : Number(document.getElementById("edit-weight").value)
                    };

                    if (updates.fullName === "") {
                        showValidationError("Full name is required.");
                        return;
                    }

                    if (updates.birthday === "") {
                        showValidationError("Date of birth is required.");
                        return;
                    }

                    if (updates.sex === "") {
                        showValidationError("Please select your sex.");
                        return;
                    }

                    if (
                        updates.heightFeet < 1 ||
                        updates.heightFeet > 7
                    ) {
                        showValidationError("Height (feet) must be between 1 and 7.");
                        return;
                    }

                    if (
                        updates.heightInches < 0 ||
                        updates.heightInches > 11
                    ) {
                        showValidationError("Height (inches) must be between 0 and 11.");
                        return;
                    }

                    if (
                        updates.weight !== null &&
                        (
                            updates.weight < 40 ||
                            updates.weight > 500
                        )
                    ) {
                        showValidationError("Please enter a valid weight.");
                        return;
                    }

                    break;

                case "running":

                    updates = {
                        yearsRunning:
                            Number(document.getElementById("edit-years-running").value),

                        primaryEvent:
                            document.getElementById("edit-primary-event").value
                    };

                    if (updates.yearsRunning < 0) {
                        showValidationError("Years running cannot be negative.");
                        return;
                    }

                    if (updates.primaryEvent === "") {
                        showValidationError("Please select your primary event.");
                        return;
                    }

                    break;

                case "goals":

                    updates = {
                        pr1:
                            document.getElementById("edit-pr1").value.trim(),

                        pr2:
                            document.getElementById("edit-pr2").value.trim()
                    };

                    break;

                case "health":

                    updates = {
                        vo2Max:
                            document.getElementById("edit-vo2-max").value === ""
                                ? null
                                : Number(document.getElementById("edit-vo2-max").value),

                        restingHeartRate:
                            document.getElementById("edit-resting-hr").value === ""
                                ? null
                                : Number(document.getElementById("edit-resting-hr").value),

                        injuryHistory:
                            document.getElementById("edit-injury-history").value.trim()
                    };

                    if (
                        updates.vo2Max !== null &&
                        (
                            updates.vo2Max < 5 ||
                            updates.vo2Max > 100
                        )
                    ) {
                        showValidationError("VO₂ Max must be between 5 and 100.");
                        return;
                    }

                    if (
                        updates.restingHeartRate !== null &&
                        (
                            updates.restingHeartRate < 20 ||
                            updates.restingHeartRate > 250
                        )
                    ) {
                        showValidationError("Please enter a valid resting heart rate.");
                        return;
                    }

                    break;

                case "preferences":

                    updates = {
                        weekStart:
                            document.getElementById("edit-weekStart").value,

                        preferredLongRunDay:
                            document.getElementById("edit-preferred-long-run-day").value,

                        preferredWorkoutDay:
                            document.getElementById("edit-preferred-workout-day").value,

                        preferredRestDay:
                            document.getElementById("edit-preferred-rest-day").value
                    };

                    if (updates.weekStart === "") {
                        showValidationError("Please choose a preferred start of week.");
                        return;
                    }

                    if (updates.preferredLongRunDay === "") {
                        showValidationError("Please choose a preferred long run day.");
                        return;
                    }

                    if (updates.preferredWorkoutDay === "") {
                        showValidationError("Please choose a preferred workout day.");
                        return;
                    }

                    if (updates.preferredRestDay === "") {
                        showValidationError("Please choose a preferred rest day.");
                        return;
                    }

                    break;

            }

            try {

                await setDoc(
                    doc(db, "users", currentUser.uid),
                    updates,
                    {
                        merge: true
                    }
                );

                Object.assign(currentUserData, updates);

                loadUser(currentUserData);

                populateSection(section);

                document.getElementById(
                    `${section}-view`
                ).style.display = "block";

                document.getElementById(
                    `${section}-edit`
                ).style.display = "none";

                button.style.display = "none";

                button.nextElementSibling.style.display = "none";

                button.previousElementSibling.style.display =
                    "inline-block";

            }
            catch (error) {

                console.error(error);

                alert("Unable to save changes.");

            }

        });

    }); 

/* ===========================
   SHOE TYPE SAVING
=========================== */

document.addEventListener("change", async (event) => {

    if (!event.target.classList.contains("shoe-type")) return;

    const user = auth.currentUser;
    if (!user) return;

    const shoeId = event.target.dataset.id;
    const type = event.target.value;

    try {

        const equipmentRef = doc(
            db,
            "users",
            user.uid,
            "equipment",
            "summary"
        );

        const equipmentDoc = await getDoc(equipmentRef);

        if (!equipmentDoc.exists()) return;

        const equipment = equipmentDoc.data();

        equipment.shoeAssignments ??= {};

        if (type === "") {

            delete equipment.shoeAssignments[shoeId];

        } else {

            equipment.shoeAssignments[shoeId] = {
                type
            };

        }

        await setDoc(
            equipmentRef,
            {
                shoeAssignments: equipment.shoeAssignments
            },
            {
                merge: true
            }
        );

    } catch (error) {

        console.error(error);

    }

});



