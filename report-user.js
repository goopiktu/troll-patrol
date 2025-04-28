browser.runtime.sendMessage({ type: "getCommenter" }).then(async (response) => {
    if (response?.profile_ID) {
        console.log("Reporting:", response.profile_ID);

        // Initialize localStorage array if not present
        let stored = localStorage.getItem('reportedUserIDs');
        let reportedUserIDs = stored ? JSON.parse(stored) : [];

        // Add profile_ID to localStorage if not already there
        if (!reportedUserIDs.includes(response.profile_ID)) {
            reportedUserIDs.push(response.profile_ID);
            localStorage.setItem('reportedUserIDs', JSON.stringify(reportedUserIDs));
        }

        if (!window.bloomFilter) {
            alert("Bloom Filter not initialized.");
            return;
        }

        const currentVersion = await BloomFilter.getVersion('reportedUsers');

        if (window.bloomFilter.check(response.profile_ID)) {
            alert("User already reported.");
            return;
        }

        window.bloomFilter.add(response.profile_ID);
        await window.bloomFilter.save('reportedUsers', currentVersion);
        alert("User added to local reports.");

    } else {
        alert("No commenter selected.");
    }
});
