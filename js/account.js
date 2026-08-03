import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);



/* ===========================
   ACCORDION
=========================== */

const headers = document.querySelectorAll(".account-card-header");

headers.forEach(header=>{

    header.addEventListener("click",()=>{

        const card = header.parentElement;

        const alreadyOpen = card.classList.contains("open");

        document
            .querySelectorAll(".account-card")
            .forEach(c=>c.classList.remove("open"));

        if(!alreadyOpen){

            card.classList.add("open");

        }

    });

});



/* ===========================
   LOAD USER
=========================== */

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        window.location.href="login.html";

        return;

    }

    document.getElementById("email").textContent=user.email;



    const userDoc=await getDoc(

        doc(db,"users",user.uid)

    );



    if(!userDoc.exists()){

        return;

    }



    const data=userDoc.data();



    setText("first-name",data.firstName);

    setText("last-name",data.lastName);

    setText("birthday",data.birthday);

    setText("age",data.age);

    setText("height",data.height);

    setText("weight",data.weight);



    calculateCompletion(data);

});



/* ===========================
   HELPERS
=========================== */

function setText(id,value){

    const el=document.getElementById(id);

    if(!el)return;

    el.textContent=value || "—";

}



function calculateCompletion(data){

    const fields=[

        "firstName",

        "lastName",

        "birthday",

        "height",

        "weight",

        "age"

    ];



    let completed=0;



    fields.forEach(field=>{

        if(data[field]){

            completed++;

        }

    });



    const percent=Math.round(

        completed/fields.length*100

    );



    document.getElementById(

        "profile-percent"

    ).textContent=percent+"%";



    document.getElementById(

        "profile-progress-bar"

    ).style.width=percent+"%";

}