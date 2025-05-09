browser.runtime.sendMessage({ type: "getCommenter" }).then(async (response) => {
    if (response?.profile_ID) {
        console.log("Reporting:", response.profile_ID);

        // Initialize localStorage array if not present
        let stored = localStorage.getItem('reportedUserIDs');
        let reportedUserIDs = stored ? JSON.parse(stored) : [];

        // Initialize metrics 
        let storeMetrics = localStorage.getItem('trollMetrics');
        let Metrics = storeMetrics ? JSON.parse(storeMetrics) : {
            uniqueReports: 0,            // Unique users reported
            totalReports: 0,             // Total reports made
            blurredEncounters: 0,        // Count of blurred content encountered
            unblurAttempts: 0,           // Count of unblurs attempted

            // Active reporters (users who report)
            // Passive avoidants (users who just blur)
           
        };

        // Add profile_ID to localStorage if not already there
        if (!reportedUserIDs.includes(response.profile_ID)) {
            reportedUserIDs.push(response.profile_ID);
            Metrics.uniqueReports += 1; // Increment unique reports
            localStorage.setItem('reportedUserIDs', JSON.stringify(reportedUserIDs));
        }

        // Increment total reports
        Metrics.totalReports += 1;
        
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

        // Save updated metrics
        localStorage.setItem('trollMetrics', JSON.stringify(Metrics));

        console.log("Updated Metrics:", Metrics);

        alert("User added to local reports.");

    } else {
        alert("No commenter selected.");
    }
});
