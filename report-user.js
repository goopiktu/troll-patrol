browser.runtime.sendMessage({ type: "getCommenter" }).then(async (response) => {
    if (response?.profile_ID) {
        console.log("Reporting:", response.profile_ID);

        const today = new Date();
        const isSunday = today.getDay() === 0; // 0 = Sunday

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
        alert("User added to reports.");

        // Only send the report if today is Sunday
        if (isSunday) {
            if (reportedUserIDs.length === 0) {
                alert("No reports to send.");
                return;
            }

            const load = {
                reports: reportedUserIDs
            };

            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/reports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(load)
                });

                if (!res.ok) {
                    throw new Error(`Server responded with ${res.status}`);
                }

                const result = await res.json();
                console.log('Batch report sent successfully:', result);
                alert("Weekly report successfully submitted.");

                // Clear stored IDs after sending
                localStorage.removeItem('reportedUserIDs');

            } catch (error) {
                console.error('Error submitting weekly report:', error);
                alert("Failed to submit weekly report.");
            }
        }
    } else {
        alert("No commenter selected.");
    }
});
