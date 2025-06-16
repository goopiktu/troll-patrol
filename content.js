// Track already blurred users
const blurredUsers = new Set();

// Initialize metrics if not present
let storedMetrics = localStorage.getItem('trollMetrics');
let Metrics = storedMetrics ? JSON.parse(storedMetrics) : {
    uniqueReports: 0,
    totalReports: 0,
    totalBlurredEncounters: 0,
    totalUnblurs: 0
};

function storeReportedUserID(profileID) {
    const existing = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');
    if (!existing.includes(profileID)) {
        existing.push(profileID);
        localStorage.setItem('reportedUserIDs', JSON.stringify(existing));
    }
}

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

        browser.runtime.sendMessage({
        type: "storeCommenter",
        profile_ID: profileID,
        display_name: displayName
        }).then(response => {
            if (response?.status === "stored") {
                console.log(`Profile ${response.profile_ID} stored, re-blurring...`);
                highlightReportedUsers();
            }
        });
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

    blurredUsers.clear();

    // Handle comments and posts that look like articles
    document.querySelectorAll("div[role='article']").forEach((element) => {
        let profileLink = element.querySelector("a[href*='facebook.com/']");
        if (!profileLink) return;

        let profileHref = profileLink.getAttribute("href");
        if (!profileHref) return;

        let profileID = extractFacebookProfileID(profileHref);
        if (!profileID) return;

        if (window.bloomFilter.check(profileID) && !blurredUsers.has(profileID)) {
            blurredUsers.add(profileID);
            Metrics.totalBlurredEncounters += 1;
            saveMetrics();

            // Instead of trusting 'element', find a solid container to blur
            let stableAncestor = getFurthestAncestor(profileLink, 20);
            if (stableAncestor) {
                const displayName = profileLink.innerText || "Unknown User";
                blurContainer(stableAncestor, profileLink, displayName, "commenter");
                console.log("✅ Blurred commenter container:", stableAncestor);
            } else {
                // Fallback for posts
                let postAncestor = getFurthestAncestor(profileLink, 15);
                if (postAncestor) {
                    blurContainer(postAncestor, profileLink, profileLink.innerText || "Unknown Poster", "poster");
                    console.log("⚠️ Fallback to poster blur:", postAncestor);
                }
            }
        }
    });

    // Handle posts via sponsored/profile_name container
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
                blurContainer(ancestor, element, displayName, "poster");
                console.log("✅ Blurred poster container:", ancestor);
            }
        }
    });
}


// The problem that im encountering with mobile implementation is that you don't have the same way of 
// selecting things the same way you can with desktop
function injectReportButtons() {
    const postContainerClassList = [
        "x9f619", "x1ja2u2z", "x78zum5", "x2lah0s", "x1n2onr6",
        "x1qughib", "x1qjc9v5", "xozqiw3", "x1q0g3np", "xjkvuk6",
        "x1iorvi4", "x11lt19s", "xe9ewy2", "x4cne27", "xifccgj"
    ];

    const postContainers = Array.from(document.querySelectorAll('div.xbmvrgn.x1diwwjn'));

    // Post Flag Buttons
    postContainers.forEach(container => {
        const matchingChild = Array.from(container.querySelectorAll("div")).find(child =>
            postContainerClassList.every(cls => child.classList.contains(cls))
        );

        if (!matchingChild || matchingChild.querySelector(".custom-troll-button")) return;

        const button = createTrollFlagButton();
        button.addEventListener("click", () => handleReportClick(button, "poster"));
        matchingChild.appendChild(button);
    });

    // Comment Flag Buttons
    const commentContainers = document.querySelectorAll('div.x1rg5ohu.xxymvpz.x17z2i9w');

    commentContainers.forEach(container => {
        if (container.querySelector(".custom-troll-button")) return;

        const button = createTrollFlagButton(true);
        button.addEventListener("click", () => handleReportClick(button, "commenter"));
        container.appendChild(button);
    });
}





function createTrollFlagButton(isForComment = false) {
    const button = document.createElement("button");
    button.className = "custom-troll-button";
    button.innerText = isForComment ? "🚩" : "🚩Flag 🧌";

    Object.assign(button.style, {
        marginTop: "8px",
        marginBottom: "8px",
        cursor: "pointer",
        padding: isForComment ? "2px 4px" : "4px 8px" ,
        borderRadius: "6px",
        backgroundColor: "#f0f0f0",
        color: "#111",
        fontWeight: "500",
        fontSize: "14px",
        border: "none",
        display: "flex"
    });

    return button;
}

function handleReportClick(button, type = "poster") {
    let ancestor;
    if (type == "poster") {
        ancestor = getFurthestAncestor(button, 15);
    } if (type == "commenter") {
        ancestor = getFurthestAncestor(button, 4);
    }

    if (!ancestor) return;


    const profileLink = ancestor.querySelector("a[href*='facebook.com/']");
    if (!profileLink) return;

    const profileHref = profileLink.getAttribute("href");
    const profileID = extractFacebookProfileID(profileHref);
    if (!profileID) return;

    let displayName = "Unknown";

    // Try getting name from inside the profileLink first
    const innerNameEl = profileLink.querySelector("a strong, span");
    if (innerNameEl && innerNameEl.textContent.trim()) {
        displayName = innerNameEl.textContent.trim();
    } else {
        // Fallback: look outside anchor (useful for comment structure)
        const fallbackEl = ancestor.querySelector("strong span, [class*='x6zurak']");
        if (fallbackEl && fallbackEl.textContent.trim()) {
            displayName = fallbackEl.textContent.trim();
        } else if (profileLink && profileLink.textContent.trim()) {
            displayName = profileLink.textContent.trim();
        }
    }

   
    blurContainer(ancestor, profileLink, displayName, type);

    console.log("Right-clicked Profile ID:", profileID);
    console.log("Display Name:", displayName);

    const reported = JSON.parse(localStorage.getItem("reportedUserIDs") || "[]");
    if (!reported.includes(profileID)) {
        reported.push(profileID);
        localStorage.setItem("reportedUserIDs", JSON.stringify(reported));
    }

   
    browser.runtime.sendMessage({
        type: "storeCommenter",
        profile_ID: profileID,
        display_name: displayName
    }).then(response => {
        if (response?.status === "stored") {
            console.log(`Profile ${response.profile_ID} stored, re-blurring...`);
            window.sendReportsAndMetrics(); 
        }
        
    });

}


function isFacebookDarkMode() {
    const bgColor = window.getComputedStyle(document.body).backgroundColor;
    return isDarkColor(bgColor);
}

function isDarkColor(colorStr) {
    // Extract RGB from "rgb(r, g, b)" or "rgba(r, g, b, a)"
    const match = colorStr.match(/\d+/g);
    if (!match) return false;

    const [r, g, b] = match.map(Number);
    // Perceived brightness formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128; // Threshold for "dark"
}

function blurContainer(container, nameElement, displayName, type = "commenter") {
    let blurWrapper = container.querySelector(".troll-blur-wrapper");
    let overlay = container.querySelector(".troll-overlay");
    const isDark = isFacebookDarkMode();

    if (!blurWrapper) {
        blurWrapper = document.createElement("div");
        blurWrapper.className = "troll-blur-wrapper";
        blurWrapper.style.backgroundColor = isDark ? "#252728" : "#ffffff";
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
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)"
        });

        const labelText = type === "poster"
            ? "This Post might be from a Troll"
            : "This Comment might be a Troll";

        overlay.innerHTML = `
            <div class="troll-overlay-content">
                <span class="troll-label">${labelText}</span>
                <br>
                <span class="troll-label-2">Hold to view</span>
                <br>
                <button class="troll-unblur-btn" style="margin-top: 10px; padding: 5px 10px;">Hold to Show</button>
            </div>`;
        container.appendChild(overlay);

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

    // Ensure blur is applied instantly
    container.dataset.trollBlurred = "true";
    container.classList.add("blurred");
    blurWrapper.style.opacity = "1";
    overlay.style.opacity = "1";

    // Prevent interaction issues
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

// Throttled scheduling
const scheduleHighlight = throttle(() => {
    const runner = () => {
        highlightReportedUsers(); // Handles styling/reactions for reported users only
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(runner);
    } else {
        runner();
    }
}, 200);

const scheduleButtonInjection = throttle(() => {
    const runner = () => {
        injectReportButtons(); // Always injects buttons regardless of user state
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(runner);
    } else {
        runner();
    }
}, 200);

// Observe for dynamic content
const observer = new MutationObserver(() => {
    scheduleHighlight();
    scheduleButtonInjection(); // Scheduled separately
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial run on page load
injectReportButtons();
highlightReportedUsers();

