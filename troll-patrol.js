(async () => {
    const bloomFilter = new BloomFilter(492320, 5);
    window.bloomFilter = bloomFilter;

    const todayISO = new Date().toISOString().split('T')[0];
    await bloomFilter.updateFromGitHub(
        `https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/main/bloomfilter-${todayISO}.json`
    );
    console.log('Bloom Filter loaded.');

    // Function to send reports and metrics immediately
    window.sendReportsAndMetrics = async function () {
        console.log('Sending reports and metrics.');

        const storedReportedUserIDs = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');
        if (storedReportedUserIDs.length > 0) {
            const requestBody = JSON.stringify({ reports: storedReportedUserIDs });
            console.log("Sending reports:", requestBody);
            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody
                });

                if (res.ok) {
                    console.log('Reports sent successfully.');
                    localStorage.removeItem('reportedUserIDs');
                } else {
                    console.error('Report upload failed with status', res.status);
                }
            } catch (err) {
                console.error('Failed to upload reports:', err);
            }
        } else {
            console.log('No reports to send.');
        }

        const storedMetrics = JSON.parse(localStorage.getItem('trollMetrics') || '{}');
        if (Object.keys(storedMetrics).length > 0) {
            const requestBody = JSON.stringify({ reports: storedMetrics });
            console.log("Sending metrics:", requestBody);
            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/metrics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody
                });
                if (res.ok) {
                    console.log('Metrics sent successfully.');
                    localStorage.removeItem('trollMetrics');
                } else {
                    console.error('Metric upload failed with status', res.status);
                }
            } catch (err) {
                console.error('Failed to upload metrics:', err);
            }
        } else {
            console.log('No metrics to send.');
        }
    };
})();
