import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   ELEMENTS
   ========================================================= */

const weekStartSelect =
    document.getElementById("week-start");

const weekRange =
    document.getElementById("targets-week-range");

const saveButton =
    document.getElementById("save-targets");

const saveMessage =
    document.getElementById("targets-save-message");

const weekBubbles =
    document.querySelectorAll(".week-bubble");


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;

/*
 * 0 = current week
 * 1 = next week
 * 2 = two weeks from now
 * ...
 * 10 = ten weeks from now
 */
let selectedWeekOffset = 0;


/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatShortDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}


function formatWeekId(date) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/*
 * Finds the current training week's start date,
 * then adds the selected number of weeks.
 */
function getSelectedWeekDates() {
    const today =
        new Date();

    const selectedStart =
        weekStartSelect.value;

    const currentDay =
        today.getDay();

    let daysSinceStart;

    if (selectedStart === "monday") {
        daysSinceStart =
            currentDay === 0 ?
                6 :
                currentDay - 1;
    } else {
        daysSinceStart =
            currentDay;
    }


    /*
     * Find CURRENT week's start.
     */
    const startDate =
        new Date(today);

    startDate.setHours(
        0,
        0,
        0,
        0
    );

    startDate.setDate(
        startDate.getDate() -
        daysSinceStart
    );


    /*
     * Move forward by selected number
     * of weeks.
     */
    startDate.setDate(
        startDate.getDate() +
        selectedWeekOffset * 7
    );


    /*
     * End date is six days after start.
     */
    const endDate =
        new Date(startDate);

    endDate.setDate(
        startDate.getDate() + 6
    );

    endDate.setHours(
        23,
        59,
        59,
        999
    );


    return {
        startDate,
        endDate
    };
}


/* =========================================================
   UPDATE DATE DISPLAY
   ========================================================= */

function updateWeekRange() {
    const {
        startDate,
        endDate
    } = getSelectedWeekDates();

    weekRange.textContent =
        `${formatShortDate(startDate)} – ` +
        `${formatShortDate(endDate)}`;
}


/* =========================================================
   UPDATE ACTIVE BUBBLE
   ========================================================= */

function updateActiveBubble() {
    weekBubbles.forEach(
        (bubble) => {
            const bubbleOffset =
                Number(
                    bubble.dataset.weekOffset
                );

            if (
                bubbleOffset ===
                selectedWeekOffset
            ) {
                bubble.classList.add(
                    "active"
                );
            } else {
                bubble.classList.remove(
                    "active"
                );
            }
        }
    );
}


/* =========================================================
   CLEAR INPUTS
   ========================================================= */

function clearTargetInputs() {
    document.getElementById(
        "target-mileage"
    ).value = "";

    document.getElementById(
        "target-runs"
    ).value = "";

    document.getElementById(
        "target-races"
    ).value = "";

    document.getElementById(
        "target-long-run"
    ).value = "";

    document.getElementById(
        "target-hard-sessions"
    ).value = "";

    document.getElementById(
        "target-note"
    ).value = "";

    saveMessage.textContent = "";
}


/* =========================================================
   LOAD USER SETTINGS
   ========================================================= */

async function loadUserSettings(user) {
    try {
        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const userSnapshot =
            await getDoc(userRef);

        if (
            userSnapshot.exists() &&
            userSnapshot.data().weekStart
        ) {
            weekStartSelect.value =
                userSnapshot.data().weekStart;
        }

        updateWeekRange();

        await loadSelectedWeekTargets(
            user
        );

    } catch (error) {
        console.error(
            "Error loading user settings:",
            error
        );
    }
}


/* =========================================================
   LOAD SELECTED WEEK
   ========================================================= */

async function loadSelectedWeekTargets(user) {
    try {
        const {
            startDate
        } = getSelectedWeekDates();

        const weekId =
            formatWeekId(startDate);

        console.log(
            "LOADING WEEK:",
            {
                selectedWeekOffset,
                weekId
            }
        );

        const planRef = doc(
            db,
            "users",
            user.uid,
            "weeklyPlans",
            weekId
        );

        const planSnapshot =
            await getDoc(planRef);


        /*
         * No plan exists for this week.
         * Show blank fields.
         */
        if (!planSnapshot.exists()) {
            clearTargetInputs();
            return;
        }


        const plan =
            planSnapshot.data();


        document.getElementById(
            "target-mileage"
        ).value =
            plan.targetMileage !==
                undefined ?
                plan.targetMileage :
                "";


        document.getElementById(
            "target-runs"
        ).value =
            plan.targetRuns !==
                undefined ?
                plan.targetRuns :
                "";


        document.getElementById(
            "target-races"
        ).value =
            plan.races !==
                undefined ?
                plan.races :
                "";


        document.getElementById(
            "target-long-run"
        ).value =
            plan.longRunTarget !==
                undefined ?
                plan.longRunTarget :
                "";


        document.getElementById(
            "target-hard-sessions"
        ).value =
            plan.hardSessions !==
                undefined ?
                plan.hardSessions :
                "";


        document.getElementById(
            "target-note"
        ).value =
            plan.note || "";


        saveMessage.textContent =
            "Saved targets loaded.";

    } catch (error) {
        console.error(
            "Error loading weekly targets:",
            error
        );
    }
}


/* =========================================================
   SAVE TARGETS
   ========================================================= */

async function saveTargets() {
    if (!currentUser) {
        return;
    }

    try {
        saveButton.disabled = true;

        saveMessage.textContent =
            "Saving...";


        const {
            startDate,
            endDate
        } = getSelectedWeekDates();


        const weekId =
            formatWeekId(startDate);


        const targetMileage =
            Number(
                document.getElementById(
                    "target-mileage"
                ).value
            ) || 0;


        const targetRuns =
            Number(
                document.getElementById(
                    "target-runs"
                ).value
            ) || 0;


        const races =
            Number(
                document.getElementById(
                    "target-races"
                ).value
            ) || 0;


        const longRunTarget =
            Number(
                document.getElementById(
                    "target-long-run"
                ).value
            ) || 0;


        const hardSessions =
            Number(
                document.getElementById(
                    "target-hard-sessions"
                ).value
            ) || 0;


        const note =
            document.getElementById(
                "target-note"
            ).value.trim();


        /*
         * Save global week-start preference.
         */
        await setDoc(
            doc(
                db,
                "users",
                currentUser.uid
            ),
            {
                weekStart:
                    weekStartSelect.value
            },
            {
                merge: true
            }
        );


        /*
         * Save ONLY the selected week's plan.
         */
        await setDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "weeklyPlans",
                weekId
            ),
            {
                weekId,

                weekStart:
                    weekStartSelect.value,

                weekStartDate:
                    startDate.toISOString(),

                weekEndDate:
                    endDate.toISOString(),

                targetMileage,

                targetRuns,

                races,

                longRunTarget,

                hardSessions,

                note,

                updatedAt:
                    new Date().toISOString()
            },
            {
                merge: true
            }
        );


        saveMessage.textContent =
            "Targets saved.";


        console.log(
            "WEEKLY TARGETS SAVED:",
            {
                selectedWeekOffset,
                weekId,
                targetMileage,
                targetRuns,
                races,
                longRunTarget,
                hardSessions,
                note
            }
        );

    } catch (error) {
        console.error(
            "Error saving targets:",
            error
        );

        saveMessage.textContent =
            "Could not save targets.";

    } finally {
        saveButton.disabled = false;
    }
}


/* =========================================================
   WEEK BUBBLE CLICKS
   ========================================================= */

weekBubbles.forEach(
    (bubble) => {
        bubble.addEventListener(
            "click",
            async () => {

                selectedWeekOffset =
                    Number(
                        bubble.dataset.weekOffset
                    );


                /*
                 * Visually move orange bubble.
                 */
                updateActiveBubble();


                /*
                 * Calculate and display dates
                 * for selected week.
                 */
                updateWeekRange();


                /*
                 * Load that exact week's
                 * saved targets.
                 */
                if (currentUser) {
                    await loadSelectedWeekTargets(
                        currentUser
                    );
                }
            }
        );
    }
);


/* =========================================================
   WEEK START CHANGE
   ========================================================= */

weekStartSelect.addEventListener(
    "change",
    async () => {

        /*
         * Recalculate selected week's dates
         * using Sunday or Monday.
         */
        updateWeekRange();


        /*
         * Because the start date changed,
         * the Firestore week ID also changed.
         */
        if (currentUser) {
            await loadSelectedWeekTargets(
                currentUser
            );
        }
    }
);


/* =========================================================
   SAVE BUTTON
   ========================================================= */

saveButton.addEventListener(
    "click",
    saveTargets
);


/* =========================================================
   AUTH
   ========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {
        if (!user) {
            window.location.href =
                "login.html";

            return;
        }

        currentUser = user;

        updateActiveBubble();

        await loadUserSettings(
            user
        );
    }
);