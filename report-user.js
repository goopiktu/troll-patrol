browser.runtime.sendMessage({ type: "getCommenter" }).then((response) => {
    if (response && response.profile_ID) {
        console.log("Reported Commenter ID:", response.profile_ID);
        alert("Reporting: " + response.profile_ID);

        // Retrieve existing reported commenters first
        browser.storage.local.get("reportedCommenters").then((result) => {
            let commenters = result.reportedCommenters || []; // Default to empty array

            // Check if the commenter already exists
            let exists = commenters.some(commenter => commenter.profile_ID === response.profile_ID);

            if (!exists) {
                // Add new commenter if not already in the list
                commenters.push({ profile_ID: response.profile_ID });

                // Save updated list back to storage
                return browser.storage.local.set({ reportedCommenters: commenters });
            } else {
                console.log("Commenter already reported, skipping.");
            }
        }).then(() => {
            // Log updated list
            browser.storage.local.get("reportedCommenters").then((updatedResult) => {
                if (updatedResult.reportedCommenters) {
                    console.log("Updated Reported Commenters:");
                    updatedResult.reportedCommenters.forEach((commenter, index) => {
                        console.log(`#${index + 1} Profile ID: ${commenter.profile_ID}`);
                    });
                }
            });
        }).catch((error) => {
            console.error("Error:", error);
        });
    } else {
        console.log("No commenter selected.");
        alert("No commenter selected.");
    }
});
