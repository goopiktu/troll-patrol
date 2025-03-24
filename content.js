document.addEventListener("contextmenu", (event) => {
    let profileLinkElement = event.target.closest("a[href*='facebook.com/']");

    if (profileLinkElement) {
        let profileHref = profileLinkElement.getAttribute("href");
        let profileID = extractFacebookProfileID(profileHref);
        let displayName = profileLinkElement.innerText || profileLinkElement.textContent;

        console.log("Right-clicked Profile ID:", profileID);
        console.log("Display Name:", displayName);

        if (profileID) {
            browser.runtime.sendMessage({
                type: "storeCommenter",
                profile_ID: profileID,
                display_name: displayName
            });
        }
    }
});

// Depth-based ancestor finder
function getFurthestAncestor(element, depth = Infinity) {
    let ancestor = element;
    let currentDepth = 0;

    while (ancestor.parentElement && currentDepth < depth) {
        ancestor = ancestor.parentElement;
        currentDepth++;
    }

    return ancestor;
}

// Function to extract Facebook Profile ID or Username
function extractFacebookProfileID(url) {
    let idMatch = url.match(/profile\.php\?id=(\d+)/);
    if (idMatch) return idMatch[1];

    let usernameMatch = url.match(/facebook\.com\/([^/?]+)/);
    return usernameMatch ? usernameMatch[1] : null;
}

// Main function to blur reported users
function highlightReportedUsers() {
    if (!window.bloomFilter) {
        console.warn("Bloom Filter not initialized.");
        return;
    }

    // Process posts/comments
    document.querySelectorAll("div[role='article']").forEach((comment) => {
        let nameElement = comment.querySelector("span.x193iq5w");
        let profileLink = comment.querySelector("a[href*='facebook.com/']");

        if (!profileLink) return;

        let profileHref = profileLink.getAttribute("href");
        if (!profileHref) return;

        let commenterProfile = extractFacebookProfileID(profileHref);
        if (!commenterProfile) return;

        if (window.bloomFilter.check(commenterProfile)) {
            if (!comment.classList.contains("blurred")) {
                console.log("Blurring comment by reported user:", commenterProfile);

                if (nameElement !== null) {
                    blurContainer(comment, nameElement, nameElement.innerText || "Unknown User");
                } else {
                    let postAncestor = getFurthestAncestor(profileLink, 15);
                    if (postAncestor) {
                        blurContainer(postAncestor, profileLink, profileLink.innerText || "Unknown Poster");
                    }
                }
            }
        }
    });

    // Process profile name elements (e.g. ads, posts)
    document.querySelectorAll('[data-ad-rendering-role="profile_name"]').forEach((element) => {
        const displayName = element.innerText || element.textContent;
        const linkElement = element.querySelector('a');
        const href = linkElement ? linkElement.href : null;

        if (!href) return;

        let profileID = extractFacebookProfileID(href);
        if (!profileID) return;

        if (window.bloomFilter.check(profileID)) {
            let ancestor = getFurthestAncestor(element, 15);
            if (ancestor && !ancestor.classList.contains("blurred")) {
                console.log("Blurring profile post by reported user:", profileID);
                blurContainer(ancestor, element, displayName);
            }
        }
    });
}

// Blur handler
function blurContainer(container, nameElement, displayName) {
    // Prevent re-processing
    if (container.classList.contains("blurred")) return;

    container.classList.add("blurred");

    // Add warning label if it doesn't already exist
    if (!nameElement.querySelector(".troll-label")) {
        let label = document.createElement("span");
        label.className = "troll-label";
        label.textContent = "⚠️ Reported";
        nameElement.appendChild(label);
    }

    // Toggle blur on click
    container.addEventListener("click", function (e) {
        e.stopPropagation();
        container.classList.toggle("blurred");
    }, { once: true });
}

// Throttle utility
function throttle(fn, wait) {
    let timer = null;
    return function (...args) {
        if (timer) return;
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, wait);
    };
}

// Schedule highlight function
const scheduleHighlight = throttle(() => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(highlightReportedUsers);
    } else {
        highlightReportedUsers();
    }
}, 200); // Throttle interval (ms)

// Observe for dynamically loaded content
const observer = new MutationObserver(() => scheduleHighlight());
observer.observe(document.body, { childList: true, subtree: true });

// Initial run on page load
highlightReportedUsers();
