// ==========================
// Tab Menu
// ==========================

function openTab(event, tabName) {

    const contents = document.getElementsByClassName("tabcontent");

    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }

    const tabs = document.getElementsByClassName("tab");

    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }

    document.getElementById(tabName).style.display = "block";

    event.currentTarget.classList.add("active");

}



// ==========================
// Initial Page
// ==========================

window.onload = function () {

    document.getElementById("about").style.display = "block";

};



// ==========================
// Fade-in Animation
// ==========================

const observer = new IntersectionObserver(

(entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");

        }

    });

},

{

    threshold:0.2

}

);



document.querySelectorAll(".card").forEach(card => {

    observer.observe(card);

});



// ==========================
// Smooth Navbar Effect
// ==========================

window.addEventListener("scroll", function () {

    const navbar = document.querySelector(".navbar");

    if (window.scrollY > 30) {

        navbar.style.background = "rgba(255,255,255,.95)";

        navbar.style.boxShadow = "0 4px 20px rgba(0,0,0,.12)";

    }

    else {

        navbar.style.background = "rgba(255,255,255,.85)";

        navbar.style.boxShadow = "0 3px 15px rgba(0,0,0,.08)";

    }

});
