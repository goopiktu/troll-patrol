document.addEventListener("contextmenu", (event) => {
    let commentElement = event.target.closest("div[role='article']");
    
    if (commentElement) {
        let spanElement = commentElement.querySelector("span.x193iq5w");
        let profileLink = commentElement.querySelector("a[href*='facebook.com/']");

        if (spanElement && profileLink) {
            let commenterName = spanElement.innerText;
            let commenterProfile = profileLink.getAttribute("href");

            console.log("Right-clicked Commenter:", commenterName, "Profile:", commenterProfile);
            
            // Send data to background.js
            browser.runtime.sendMessage({
                type: "storeCommenter",
                commenter: commenterName,
                profileURL: commenterProfile
            });
        }
    }
});
