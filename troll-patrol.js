(async () => {
    const bloomFilter = new BloomFilter(492320, 5);
    window.bloomFilter = bloomFilter;
    const todayISO = new Date().toISOString().split('T')[0];
    await bloomFilter.updateFromGitHub(`https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/main/bloomfilter-${todayISO}.json`);
    console.log('Bloom Filter loaded.');
    const today = new Date();
    const isSunday = today.getDay() === 0;
    if (isSunday) {
        const storedReportedUserIDs = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');
        if (storedReportedUserIDs.length > 0) {
            try {
                const res = await fetch('https://trollpatrolapi.vercel.app/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reports: storedReportedUserIDs })
                });
                if (res.ok) {
                    console.log('Reports sent.');
                    localStorage.removeItem('reportedUserIDs');
                } else {
                    console.error('Report upload failed with status', res.status);
                }
            } catch (err) {
                console.error('Failed to upload reports:', err);
            }
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
                    console.log('Metrics sent.');
                    localStorage.removeItem('trollMetrics');
                } else {
                    console.error('Metric upload failed with status', res.status);
                }
            } catch (err) {
                console.error('Failed to upload metrics:', err);
            }
        }
    }
})();