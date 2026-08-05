import { auth, db } from "./firebase.js";
import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --------------------------------------------------
// Save Tutorial Data
// --------------------------------------------------

export async function saveTutorialData() {

    const user = auth.currentUser;

    if (!user) {
        console.error("No authenticated user.");
        return;
    }

    try {

        await setDoc(
            doc(db, "users", user.uid),
            {

                fullName:
                    document.getElementById("fullName").value.trim(),

                birthday:
                    document.getElementById("birthday").value,

                heightFeet:
                    Number(document.getElementById("heightFeet").value),

                heightInches:
                    Number(document.getElementById("heightInches").value),

                weight:
                    document.getElementById("weight").value === ""
                        ? null
                        : Number(document.getElementById("weight").value),

                sex:
                    document.getElementById("sex").value,

                yearsRunning:
                    Number(document.getElementById("yearsRunning").value),

                primaryEvent:
                    document.getElementById("primaryEvent").value,

                vo2Max:
                    document.getElementById("vo2Max").value === ""
                        ? null
                        : Number(document.getElementById("vo2Max").value),

                weekStart:
                    document.getElementById("weekStart").value,

                preferredLongRunDay:
                    document.getElementById("preferredLongRunDay").value,

                preferredWorkoutDay:
                    document.getElementById("preferredWorkoutDay").value,

                preferredRestDay:
                    document.getElementById("preferredRestDay").value,

                tutorialCompleted: true,

                updatedAt: new Date().toISOString()

            },

            {
                merge: true
            }

        );

    } catch (error) {

        console.error("Error saving tutorial:", error);

    }

}