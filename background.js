let lastCommenter = null;

// Store last right-clicked commenter
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "storeCommenter") {
        lastCommenter = {
            profile_ID: message.profile_ID // Store only the profile ID
        };
    } else if (message.type === "getCommenter") {
        sendResponse(lastCommenter);
    }
});

// Context menu item
browser.contextMenus.create({
    id: "report-user",
    title: "Report User",
    contexts: ["link"]
});

// Run `report-user.js` and `content.js` when menu item is clicked
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "report-user") {
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["report-user.js"]
        });

        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });
    }
});
