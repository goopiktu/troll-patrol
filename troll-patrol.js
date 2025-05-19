(async () => {
    const bloomFilter = new BloomFilter(492320, 5);
    window.bloomFilter = bloomFilter;
    const todayISO = new Date().toISOString().split('T')[0];
    await bloomFilter.updateFromGitHub(`https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/main/bloomfilter-${todayISO}.json`);
    console.log('Bloom Filter loaded.');

    // Function to check if reports were sent today
    function reportsSentToday() {
        const lastSentDate = localStorage.getItem('lastReportSentDate');
        return lastSentDate === new Date().toISOString().split('T')[0];
    }

    // Function to send reports and metrics
    async function sendReportsAndMetrics() {
        if (reportsSentToday()) {
            console.log('Reports already sent today. Skipping.');
            return;
        }

        console.log('Sending reports and metrics.');

        const storedReportedUserIDs = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');
        if (storedReportedUserIDs.length > 0) {
            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reports: storedReportedUserIDs })
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
            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/metrics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(storedMetrics)
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

        // Mark today's date as sent
        localStorage.setItem('lastReportSentDate', new Date().toISOString().split('T')[0]);
    }

    // Schedule to send reports automatically (excludes 11 PM - 12 AM)
    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        
        // Only send reports if it's not between 11 PM and 12 AM
        if (hour < 23  && !reportsSentToday()) {
            sendReportsAndMetrics();
        }
    }, 60 * 60 * 1000); // Checks every 1 hr
})();
