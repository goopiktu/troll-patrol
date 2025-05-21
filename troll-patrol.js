const todayISO = new Date().toISOString().split('T')[0];

async function initializeBloomFilter() {
    const bloomFilter = new BloomFilter(492320, 5);
    window.bloomFilter = bloomFilter;
    console.log('BloomFilter instance created and assigned to window.');

    try {
        await bloomFilter.updateFromGitHub(`https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/main/bloomfilter-${todayISO}.json`);
        console.log('Bloom Filter loaded.');
    } catch (error) {
        console.error('Failed to load Bloom Filter:', error);
    }
}

function reportSentToday() {
    const lastSentDate = localStorage.getItem('lastReportSentDate');
    return lastSentDate === todayISO;
}

async function sendReportedUserID() {
    const stored = JSON.parse(localStorage.getItem('reportedUserIDs') || '[]');

    if (stored.length === 0) return console.log('No reports to send.');

    try {
        const res = await fetch('https://trollpatrolapi.vercel.app/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reports: stored })
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
}

async function sendMetrics() {
    const metrics = JSON.parse(localStorage.getItem('trollMetrics') || '{}');

    if (Object.keys(metrics).length === 0) return console.log('No metrics to send.');

    try {
        const res = await fetch('https://trollpatrolapi.vercel.app/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metrics)
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
}

async function main() {
    await initializeBloomFilter(); // Block until it's ready

    setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour < 23 && !reportSentToday()) {
            console.log('Sending reports and metrics...');
            await sendReportedUserID();
            await sendMetrics();
            localStorage.setItem('lastReportSentDate', todayISO);
        }
    }, 60 * 60 * 1000);
}

main();
