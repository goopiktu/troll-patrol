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

        // Prepare the load to send
        const load = {
            reports: [response.profile_ID]
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
            console.log('Report sent successfully:', result);
            alert("Report successfully submitted.");

        } catch (error) {
            console.error('Error submitting report:', error);
            alert("Failed to submit report.");
        }

    } else {
        alert("No commenter selected.");
    }
});