// Track already blurred users
const blurredUsers = new Set();

// Initialize metrics if not present
let storedMetrics = localStorage.getItem('trollMetrics');
let Metrics = storedMetrics ? JSON.parse(storedMetrics) : {
    totalBlurredEncounters: 0,
    totalUnblurs: 0
};

// Save updated metrics
function saveMetrics() {
    localStorage.setItem('trollMetrics', JSON.stringify(Metrics));
}


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

    // Clear existing blurred users (to prevent duplicates)
    blurredUsers.clear();

    // Process posts/comments
    document.querySelectorAll("div[role='article']").forEach((comment) => {
        let nameElement = comment.querySelector("span.x193iq5w");
        let profileLink = comment.querySelector("a[href*='facebook.com/']");

        if (!profileLink) return;

        let profileHref = profileLink.getAttribute("href");
        if (!profileHref) return;

        let commenterProfile = extractFacebookProfileID(profileHref);
        if (!commenterProfile) return;

        if (window.bloomFilter.check(commenterProfile) && !blurredUsers.has(commenterProfile)) {
            blurredUsers.add(commenterProfile);
            Metrics.totalBlurredEncounters += 1;
            saveMetrics();
            if (nameElement !== null) {
                blurContainer(comment, nameElement, nameElement.innerText || "Unknown User");
            } else {
                let postAncestor = getFurthestAncestor(profileLink, 15);
                if (postAncestor) {
                    blurContainer(postAncestor, profileLink, profileLink.innerText || "Unknown Poster");
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

        if (window.bloomFilter.check(profileID) && !blurredUsers.has(profileID)) {
            blurredUsers.add(profileID);

            let ancestor = getFurthestAncestor(element, 15);
            if (ancestor && !ancestor.classList.contains("blurred")) {
                blurContainer(ancestor, element, displayName);
            }
        }
    });
}

function blurContainer(container, nameElement, displayName) {
    let blurWrapper = container.querySelector(".troll-blur-wrapper");
    let overlay = container.querySelector(".troll-overlay");

    if (!blurWrapper) {
        blurWrapper = document.createElement("div");
        blurWrapper.className = "troll-blur-wrapper";
        Object.assign(blurWrapper.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "10",
            transition: "opacity 0.2s ease",
            pointerEvents: "none",
            backgroundColor: "#252728",
        });
        container.appendChild(blurWrapper);
    }

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "troll-overlay";
        Object.assign(overlay.style, {
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: "15",
            textAlign: "center",
            color: "#FFFFFF",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            padding: "10px 20px",
            borderRadius: "8px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        });
        overlay.innerHTML = `
            <div class="troll-overlay-content">
                <span class="troll-label">This Comment might be a Troll</span>
                <br>
                <span class="troll-label-2">Hold to view</span>
                <br>
                <button class="troll-unblur-btn" style="margin-top: 10px; padding: 5px 10px;">Hold to Show</button>
            </div>`;
        container.appendChild(overlay);

        // Handle "Hold to Show" functionality — only attach once!
        const unblurButton = overlay.querySelector(".troll-unblur-btn");
        let isHolding = false;

        unblurButton.addEventListener("mousedown", function (e) {
            e.stopPropagation();
            isHolding = true;
            container.classList.remove("blurred");
            blurWrapper.style.opacity = "0";
            overlay.style.opacity = "0";
            Metrics.totalUnblurs += 1;
            saveMetrics();
        });

        document.addEventListener("mouseup", function () {
            if (isHolding) {
                isHolding = false;
                container.classList.add("blurred");
                blurWrapper.style.opacity = "1";
                overlay.style.opacity = "1";
            }
        });
    }

    // Ensure these are shown on (re-)blur
    container.dataset.trollBlurred = "true";
    container.classList.add("blurred");
    blurWrapper.style.opacity = "1";
    overlay.style.opacity = "1";

    // Prevent hover overlay interaction issues
    blurWrapper.addEventListener("click", (e) => e.stopPropagation());
    overlay.addEventListener("click", (e) => e.stopPropagation());
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
}, 200);

// Observe for dynamically loaded content
const observer = new MutationObserver(() => scheduleHighlight());
observer.observe(document.body, { childList: true, subtree: true });

// Initial run on page load
highlightReportedUsers();
