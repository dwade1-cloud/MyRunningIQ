import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ===========================
   ACCORDION
=========================== */

document.querySelectorAll(".account-card-header").forEach(header => {

    header.addEventListener("click", () => {

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

    const userData = userDoc.exists() ? userDoc.data() : {};
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

function calculateCompletion(data) {

    const fields = [
        "fullName",
        "age",
        "sex",
        "height",
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

/* ===========================
   USER DATA
=========================== */

function loadUser(data) {

    setText("full-name", data.fullName);
    setText("sex", data.sex);
    setText("age", data.age);
    setText("height", data.height);
    setText("weight", data.weight);

    setText("years-running", data.yearsRunning);
    setText("primary-event", data.primaryEvent);

    setText("pr1", data.pr1);
    setText("pr2", data.pr2);

    setText("vo2-max", data.vo2Max);
    setText("resting-hr", data.restingHeartRate);
    setText("injury-history", data.injuryHistory);

    setText("member-since", data.memberSince);

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


