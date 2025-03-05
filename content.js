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



// Function to highlight reported users
function highlightReportedUsers() {
    browser.storage.local.get("reportedCommenters").then((result) => {
        let reportedUsers = result.reportedCommenters || [];

        // Select all Facebook comments
        document.querySelectorAll("div[role='article']").forEach((comment) => {
            let nameElement = comment.querySelector("span.x193iq5w"); // Select name element
            if (!nameElement) return;

            let commenterName = nameElement.textContent.trim();

            // Check if the commenter is in the reported users list
            let reported = reportedUsers.find(user => user.name === commenterName);

            if (reported) {
                // Apply red highlight
                comment.style.border = "2px solid red";
                comment.style.borderRadius = "5px";
                
                // Add a "Potential Troll" label
                if (!comment.querySelector(".troll-label")) {
                    let label = document.createElement("span");
                    label.classList.add("troll-label");
                    label.textContent = "⚠️ Potential Troll";
                    label.style.color = "red";
                    label.style.fontWeight = "bold";
                    label.style.marginLeft = "10px";
                    nameElement.appendChild(label);
                }
            }
        });
    });
}

// Run the function on page load
highlightReportedUsers();

// Observe the DOM for dynamically loaded comments (Facebook loads comments asynchronously)
const observer = new MutationObserver(() => highlightReportedUsers());
observer.observe(document.body, { childList: true, subtree: true });
