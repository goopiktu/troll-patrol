document.addEventListener("contextmenu", (event) => {
    let commentElement = event.target.closest("div[role='article']");
    
    if (commentElement) {
        let profileLink = commentElement.querySelector("a[href*='facebook.com/']");

        if (profileLink) {
            let commenterProfile = profileLink.getAttribute("href");

            // Extract the user ID or username
            commenterProfile = extractFacebookProfileID(commenterProfile);

            if (commenterProfile) {
                console.log("Right-clicked Commenter ID:", commenterProfile);
                
                // Send data to background.js
                browser.runtime.sendMessage({
                    type: "storeCommenter",
                    profile_ID: commenterProfile
                });
            }
        }
    }
});

// Function to extract Facebook Profile ID or Username
function extractFacebookProfileID(url) {
    // Handle profile ID format: facebook.com/profile.php?id=123456789
    let idMatch = url.match(/profile\.php\?id=(\d+)/);
    if (idMatch) return idMatch[1];

    // Handle username format: facebook.com/username
    let usernameMatch = url.match(/facebook\.com\/([^/?]+)/);
    return usernameMatch ? usernameMatch[1] : null;
}


// Function to highlight reported users
function highlightReportedUsers() {
    browser.storage.local.get("reportedCommenters").then((result) => {
        let reportedUsers = result.reportedCommenters || [];

        // Select all Facebook comments
        document.querySelectorAll("div[role='article']").forEach((comment) => {
            let nameElement = comment.querySelector("span.x193iq5w"); // Select name element
            
            let profileLink = comment.querySelector("a[href*='facebook.com/']");
            if (!profileLink) return;

            let commenterProfile = extractFacebookProfileID(profileLink.getAttribute("href"));
            if (!commenterProfile) return;

            // Check if the commenter is in the reported users list
            let reported = reportedUsers.find(user => user.profile_ID === commenterProfile);

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
