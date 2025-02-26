browser.runtime.sendMessage({ type: "getCommenter" }).then((response) => {
    if (response && response.name) {
        console.log("Reported Commenter:", response.name);
        alert("Reporting: " + response.name);

        // Retrieve existing reported commenters first
        browser.storage.local.get("reportedCommenters").then((result) => {
            let commenters = result.reportedCommenters || []; // Default to empty array

            // Check if the commenter already exists
            let exists = commenters.some(commenter => commenter.name === response.name);

            if (!exists) {
                // Add new commenter if not already in the list
                commenters.push({
                    name: response.name,
                    profile: response.profile
                });

                // Save updated list back to storage and THEN retrieve the updated list
                return browser.storage.local.set({ reportedCommenters: commenters }).then(() => {
                    return browser.storage.local.get("reportedCommenters");
                });
            } else {
                console.log("Commenter already reported, skipping.");
                return browser.storage.local.get("reportedCommenters"); // Still return the latest data
            }
        }).then((updatedResult) => {
            // Now, retrieve and log the latest list
            if (updatedResult.reportedCommenters) {
                console.log("Updated Reported Commenters:");
                updatedResult.reportedCommenters.forEach((commenter, index) => {
                    console.log(`#${index + 1} Name: ${commenter.name}, Profile: ${commenter.profile}`);
                });
            }
        }).catch((error) => {
            console.error("Error:", error);
        });

    } else {
        console.log("No commenter selected.");
        alert("No commenter selected.");
    }
});
