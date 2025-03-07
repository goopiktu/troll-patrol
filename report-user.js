browser.runtime.sendMessage({ type: "getCommenter" }).then((response) => {
    if (response && response.profile_ID) {
        console.log("Reported Commenter ID:", response.profile_ID);
        alert("Reporting: " + response.profile_ID);

        if (window.bloomFilter) {
            if (window.bloomFilter.check(response.profile_ID)) {
                console.log("User already reported.");
                alert("User is already reported. no need to add to bloom filter");

                return;
            } else {
                window.bloomFilter.add(response.profile_ID);
                console.log("User added to Bloom Filter.");
            }
        }

        // // Retrieve existing reported commenters
        // browser.storage.local.get("reportedCommenters").then((result) => {
        //     let commenters = result.reportedCommenters || []; // Default to empty array

        //     // Check if the commenter is already in the list
        //     let exists = commenters.some(commenter => commenter.profile_ID === response.profile_ID);

        //     if (!exists) {
        //         commenters.push({ profile_ID: response.profile_ID });

        //         // Save updated list to storage
        //         return browser.storage.local.set({ reportedCommenters: commenters }).then(() => {
        //             console.log("Commenter added to storage.");
        //         });
        //     } else {
        //         console.log("Commenter already in storage, skipping.");
        //     }
        // }).then(() => {
        //     // Log updated list
        //     browser.storage.local.get("reportedCommenters").then((updatedResult) => {
        //         if (updatedResult.reportedCommenters) {
        //             console.log("Updated Reported Commenters:");
        //             updatedResult.reportedCommenters.forEach((commenter, index) => {
        //                 console.log(`#${index + 1} Profile ID: ${commenter.profile_ID}`);
        //             });
        //         }
        //     });
        // }).catch((error) => {
        //     console.error("Error:", error);
        // });

        // Persist Bloom Filter state
       // browser.storage.local.set({ reportedUsers: window.bloomFilter.save() });
    } else {
        console.log("No commenter selected.");
        alert("No commenter selected.");
    }
});
