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
    // Prevent re-processing if already blurred
    if (container.classList.contains("blurred") || container.querySelector(".troll-blur-wrapper")) return;

    // Skip blur if the user has unblurred it before
    if (sessionStorage.getItem(`unblurred-${displayName}`) === "true") return;

    container.classList.add("blurred");
    container.style.position = "relative"; // Ensure correct positioning

    // Create the blur wrapper (only if not already added)
    let blurWrapper = document.createElement("div");
    blurWrapper.className = "troll-blur-wrapper";

    // Move all children into the blur wrapper
    while (container.firstChild) {
        blurWrapper.appendChild(container.firstChild);
    }
    container.appendChild(blurWrapper);

    // Create the overlay
    let overlay = document.createElement("div");
    overlay.className = "troll-overlay";
    overlay.innerHTML = `<div class="troll-overlay-content">
                            <span class="troll-label">This Comment might be a Troll</span>
                            <span class="troll-labal-2">Do you still wish to view?</span>
                            <button class="troll-unblur-btn">Show</button>
                         </div>`;

    container.appendChild(overlay);

    // Handle unblur button click
    overlay.querySelector(".troll-unblur-btn").addEventListener("click", function (e) {
        e.stopPropagation();
        container.classList.remove("blurred"); // Remove blur class
        blurWrapper.style.filter = "none"; // Remove blur effect
        overlay.remove(); // Remove the overlay
        sessionStorage.setItem(`unblurred-${displayName}`, "true"); // Save unblur state
    });
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
