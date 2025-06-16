browser.runtime.sendMessage({ type: "getCommenter" }).then(async (response) => {
    if (response?.profile_ID) {
        console.log("Reporting:", response.profile_ID);

        let reportedUserIDs = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');
        let Metrics = JSON.parse(localStorage.getItem('trollMetrics') || JSON.stringify({
            uniqueReports: 0,
            totalReports: 0,
            blurredEncounters: 0,
            totalUnblurs: 0
        }));

        if (!reportedUserIDs.includes(response.profile_ID)) {
            reportedUserIDs.push(response.profile_ID);
            Metrics.uniqueReports += 1;
        }

        Metrics.totalReports += 1;

        localStorage.setItem('reportedUserIDs', JSON.stringify(reportedUserIDs));
        localStorage.setItem('trollMetrics', JSON.stringify(Metrics));

        if (!window.bloomFilter) {
            console.log("Bloom Filter not initialized.");
            return;
        }

        const currentVersion = await BloomFilter.getVersion('reportedUsers');

        if (window.bloomFilter.check(response.profile_ID)) {
            console.log("User already reported.");
            return;
        }

        window.bloomFilter.add(response.profile_ID);
        await window.bloomFilter.save('reportedUsers', currentVersion);

        console.log("User added to local reports.");
    } else {
        console.log("No commenter selected.");
    }
});