import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   HELPERS
   ========================================================= */

function formatWeekId(date) {
    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatShortDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}


function getCurrentWeekDates(weekStart) {
    const today = new Date();

    const currentDay =
        today.getDay();

    let daysSinceStart;

    if (weekStart === "sunday") {
        daysSinceStart =
            currentDay;
    } else {
        daysSinceStart =
            currentDay === 0 ?
                6 :
                currentDay - 1;
    }

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


function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function setWidth(id, percent) {
    const element =
        document.getElementById(id);

    if (element) {
        element.style.width =
            `${Math.min(
                Math.max(percent, 0),
                100
            )}%`;
    }
}


/* =========================================================
   USER WEEK START
   ========================================================= */

async function getWeekStart(user) {
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
            return userSnapshot.data().weekStart;
        }

        return "monday";

    } catch (error) {
        console.error(
            "Error loading week start:",
            error
        );

        return "monday";
    }
}


/* =========================================================
   LATEST RUN
   ========================================================= */

async function loadLatestRun(user) {
    try {
        const activitiesRef = collection(
            db,
            "users",
            user.uid,
            "activities"
        );

        const latestRunQuery = query(
            activitiesRef,
            orderBy(
                "startDate",
                "desc"
            ),
            limit(1)
        );

        const snapshot =
            await getDocs(latestRunQuery);

        if (snapshot.empty) {
            console.log(
                "No activities found."
            );

            return;
        }

        const activity =
            snapshot.docs[0].data();

        console.log(
            "LATEST ACTIVITY:",
            activity
        );


        /* ACTIVITY NAME */

        setText(
            "latest-run-name",
            activity.name || "Run"
        );


        /* DISTANCE */

        const distanceMiles =
            activity.distanceMeters /
            1609.344;

        setText(
            "latest-distance",
            distanceMiles.toFixed(2)
        );


        /* PACE */

        if (
            distanceMiles > 0 &&
            activity.movingTimeSeconds
        ) {
            const paceSecondsPerMile =
                activity.movingTimeSeconds /
                distanceMiles;

            let paceMinutes =
                Math.floor(
                    paceSecondsPerMile / 60
                );

            let paceSeconds =
                Math.round(
                    paceSecondsPerMile % 60
                );

            if (paceSeconds === 60) {
                paceMinutes++;
                paceSeconds = 0;
            }

            const formattedPace =
                `${paceMinutes}:` +
                paceSeconds
                    .toString()
                    .padStart(2, "0");

            setText(
                "latest-pace",
                formattedPace
            );
        } else {
            setText(
                "latest-pace",
                "--"
            );
        }


        /* MOVING TIME */

        const totalSeconds =
            activity.movingTimeSeconds || 0;

        const hours =
            Math.floor(
                totalSeconds / 3600
            );

        const minutes =
            Math.floor(
                (
                    totalSeconds %
                    3600
                ) / 60
            );

        const seconds =
            totalSeconds % 60;

        let formattedTime;

        if (hours > 0) {
            formattedTime =
                `${hours}:` +
                `${minutes
                    .toString()
                    .padStart(2, "0")}:` +
                `${seconds
                    .toString()
                    .padStart(2, "0")}`;
        } else {
            formattedTime =
                `${minutes}:` +
                `${seconds
                    .toString()
                    .padStart(2, "0")}`;
        }

        setText(
            "latest-time",
            formattedTime
        );


        /* HEART RATE */

        const heartRate =
            activity.averageHeartRate;

        setText(
            "latest-hr",
            heartRate !== null &&
            heartRate !== undefined ?
                Math.round(heartRate) :
                "--"
        );


        /* ELEVATION */

        const elevationMeters =
            activity.totalElevationGainMeters ||
            0;

        const elevationFeet =
            elevationMeters * 3.28084;

        setText(
            "latest-elevation",
            Math.round(elevationFeet)
        );


        /* CADENCE */

        const cadence =
            activity.averageCadence;

        setText(
            "latest-cadence",
            cadence !== null &&
            cadence !== undefined ?
                Math.round(cadence * 2) :
                "--"
        );


        /* DATE + TIME */

        const runDate =
            new Date(activity.startDate);

        const formattedDate =
            runDate.toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    day: "numeric"
                }
            );

        const formattedStartTime =
            runDate.toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );

        setText(
            "latest-run-date",
            `${formattedDate} • ` +
            `${formattedStartTime}`
        );

    } catch (error) {
        console.error(
            "Error loading latest activity:",
            error
        );
    }
}


/* =========================================================
   WEEKLY SNAPSHOT
   ========================================================= */

async function loadWeeklySnapshot(
    user,
    weekStart
) {
    try {
        const {
            startDate,
            endDate
        } = getCurrentWeekDates(
            weekStart
        );

        const activitiesRef = collection(
            db,
            "users",
            user.uid,
            "activities"
        );

        const weeklyQuery = query(
            activitiesRef,
            where(
                "startDate",
                ">=",
                startDate.toISOString()
            ),
            where(
                "startDate",
                "<=",
                endDate.toISOString()
            ),
            orderBy(
                "startDate",
                "asc"
            )
        );

        const snapshot =
            await getDocs(weeklyQuery);

        let totalDistanceMeters = 0;
        let totalMovingTimeSeconds = 0;
        let runCount = 0;
        let longestRunMiles = 0;

        snapshot.forEach(
            (activityDoc) => {
                const activity =
                    activityDoc.data();

                if (
                    activity.sportType !==
                        "Run" &&
                    activity.sportType !==
                        "TrailRun"
                ) {
                    return;
                }

                const distanceMeters =
                    activity.distanceMeters ||
                    0;

                const runMiles =
                    distanceMeters /
                    1609.344;

                totalDistanceMeters +=
                    distanceMeters;

                totalMovingTimeSeconds +=
                    activity
                        .movingTimeSeconds ||
                    0;

                runCount++;

                if (
                    runMiles >
                    longestRunMiles
                ) {
                    longestRunMiles =
                        runMiles;
                }
            }
        );


        /* MILEAGE */

        const totalMiles =
            totalDistanceMeters /
            1609.344;


        /* TOTAL TIME */

        const hours =
            Math.floor(
                totalMovingTimeSeconds /
                3600
            );

        const minutes =
            Math.floor(
                (
                    totalMovingTimeSeconds %
                    3600
                ) / 60
            );

        const formattedTime =
            hours > 0 ?
                `${hours}h ${minutes}m` :
                `${minutes}m`;


        /* UPDATE SNAPSHOT */

        setText(
            "weekly-mileage",
            totalMiles.toFixed(1)
        );

        setText(
            "weekly-runs",
            runCount
        );

        setText(
            "weekly-time",
            formattedTime
        );


        /* EASY/HARD COMES LATER */

        setText(
            "easy-mileage-percent",
            "--"
        );

        setText(
            "hard-mileage-percent",
            "--"
        );


        /* WEEK RANGE */

        setText(
            "week-date-range",
            `${formatShortDate(
                startDate
            )} – ${formatShortDate(
                endDate
            )}`
        );


        const weeklyStats = {
            totalMiles,
            runCount,
            totalMovingTimeSeconds,
            longestRunMiles,
            startDate,
            endDate
        };

        console.log(
            "WEEKLY SNAPSHOT:",
            weeklyStats
        );

        return weeklyStats;

    } catch (error) {
        console.error(
            "Error loading weekly snapshot:",
            error
        );

        return null;
    }
}


/* =========================================================
   WEEKLY TARGETS
   ========================================================= */

async function loadWeeklyTargets(
    user,
    weekStart,
    weeklyStats
) {
    try {
        const {
            startDate
        } = getCurrentWeekDates(
            weekStart
        );

        const weekId =
            formatWeekId(startDate);

        const planRef = doc(
            db,
            "users",
            user.uid,
            "weeklyPlans",
            weekId
        );

        const planSnapshot =
            await getDoc(planRef);

        if (!planSnapshot.exists()) {
            console.log(
                "No weekly targets found."
            );

            return;
        }

        const plan =
            planSnapshot.data();

        console.log(
            "WEEKLY TARGETS:",
            plan
        );


        const targetMileage =
            Number(
                plan.targetMileage
            ) || 0;

        const targetRuns =
            Number(
                plan.targetRuns
            ) || 0;

        const races =
            Number(
                plan.races
            ) || 0;

        const longRunTarget =
            Number(
                plan.longRunTarget
            ) || 0;

        const hardSessions =
            Number(
                plan.hardSessions
            ) || 0;


        /* =================================================
           MILEAGE PROGRESS
           ================================================= */

        let mileagePercent = 0;

        if (targetMileage > 0) {
            mileagePercent =
                (
                    weeklyStats.totalMiles /
                    targetMileage
                ) * 100;
        }

        const remainingMileage =
            Math.max(
                targetMileage -
                weeklyStats.totalMiles,
                0
            );


        setText(
            "weekly-progress-current",
            weeklyStats
                .totalMiles
                .toFixed(1)
        );

        setText(
            "weekly-progress-target",
            targetMileage
        );

        setText(
            "weekly-progress-percent",
            `${Math.round(
                mileagePercent
            )}% complete`
        );

        setText(
            "weekly-mileage-remaining",
            remainingMileage > 0 ?
                `${remainingMileage
                    .toFixed(1)} mi remaining` :
                "Goal reached"
        );

        setWidth(
            "weekly-progress-bar",
            mileagePercent
        );


        /* =================================================
           WEEKLY TARGETS CARD
           ================================================= */

        setText(
            "target-mileage-current",
            weeklyStats
                .totalMiles
                .toFixed(1)
        );

        setText(
            "target-mileage-goal",
            targetMileage
        );


        setText(
            "target-runs-current",
            weeklyStats.runCount
        );

        setText(
            "target-runs-goal",
            targetRuns
        );


        /* RACES */

        setText(
            "target-races-goal",
            races
        );


        /* LONG RUN */

        setText(
            "target-long-run-current",
            weeklyStats
                .longestRunMiles
                .toFixed(1)
        );

        setText(
            "target-long-run-goal",
            longRunTarget
        );


        /* HARD SESSIONS */

        setText(
            "target-hard-sessions-goal",
            hardSessions
        );


        /* TARGET PROGRESS BARS */

        setWidth(
            "target-mileage-bar",
            mileagePercent
        );


        let runPercent = 0;

        if (targetRuns > 0) {
            runPercent =
                (
                    weeklyStats.runCount /
                    targetRuns
                ) * 100;
        }

        setWidth(
            "target-runs-bar",
            runPercent
        );


        let longRunPercent = 0;

        if (longRunTarget > 0) {
            longRunPercent =
                (
                    weeklyStats
                        .longestRunMiles /
                    longRunTarget
                ) * 100;
        }

        setWidth(
            "target-long-run-bar",
            longRunPercent
        );


        console.log(
            "DASHBOARD TARGET PARAMETERS:",
            {
                weekId,
                targetMileage,
                targetRuns,
                races,
                longRunTarget,
                hardSessions,
                note:
                    plan.note || ""
            }
        );

    } catch (error) {
        console.error(
            "Error loading weekly targets:",
            error
        );
    }
}

/* =========================================================
   STRAVA AUTO SYNC
   ========================================================= */
async function syncStravaActivities(user) {
    try {
        console.log(
            "Starting automatic Strava sync..."
        );

        const idToken =
            await user.getIdToken();

        console.log(
            "CURRENT FIREBASE UID:",
            user.uid
        );

        console.log(
            "CURRENT FIREBASE EMAIL:",
            user.email
        );    

        const response = await fetch(
            "https://us-central1-myrunningiq.cloudfunctions.net/" +
            "getStravaActivities",
            {
                headers: {
                    "Authorization":
                        `Bearer ${idToken}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            console.error(
                "Automatic Strava sync failed:",
                response.status,
                JSON.stringify(data)
            );

            return false;
        }

        console.log(
            "Automatic Strava sync complete:",
            data
        );

        return true;
    } catch (error) {
        console.error(
            "Automatic Strava sync error:",
            error
        );

        return false;
    }
}

/* =========================================================
   DASHBOARD STARTUP
   ========================================================= */
onAuthStateChanged(
    auth,
    async (user) => {
        if (!user) {
            window.location.href =
                "login.html";
            return;
        }

        try {
            /*
             * Sync Strava first so Firestore
             * contains the newest activities
             * before the dashboard reads it.
             */
            await syncStravaActivities(user);

            /*
             * Load the user's global definition
             * of a training week.
             */
            const weekStart =
                await getWeekStart(user);

            console.log(
                "WEEK START:",
                weekStart
            );

            /*
             * Latest run and weekly activity
             * data can load at the same time.
             */
            const results =
                await Promise.all([
                    loadWeeklySnapshot(
                        user,
                        weekStart
                    ),
                    loadLatestRun(user)
                ]);

            const weeklyStats =
                results[0];

            /*
             * Targets depend on weeklyStats,
             * so load these afterward.
             */
            if (weeklyStats) {
                await loadWeeklyTargets(
                    user,
                    weekStart,
                    weeklyStats
                );
            }
        } catch (error) {
            console.error(
                "Dashboard startup error:",
                error
            );
        }
    }
);