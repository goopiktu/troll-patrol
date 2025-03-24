browser.runtime.sendMessage({ type: "getCommenter" }).then(async (response) => {
    if (response?.profile_ID) {
        console.log("Reporting:", response.profile_ID);
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
        alert("User added to reports.");
    } else {
        alert("No commenter selected.");
    }
});