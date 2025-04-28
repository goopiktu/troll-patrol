(async () => {
    const bloomFilter = new BloomFilter(492320, 5);
    window.bloomFilter = bloomFilter;
    const todayISO = new Date().toISOString().split('T')[0];
    await bloomFilter.updateFromGitHub(`https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/main/bloomfilter-${todayISO}.json`);
    console.log('Bloom Filter loaded.');
    const today = new Date();
    const isSunday = today.getDay() === 0; // sunday
    
    if (isSunday) {
        let stored = localStorage.getItem('reportedUserIDs');
        let reportedUserIDs = stored ? JSON.parse(stored) : [];
        if (reportedUserIDs.length > 0) {
            console.log('Sending batch reports:', reportedUserIDs);
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
                localStorage.removeItem('reportedUserIDs');
            } catch (error) {
                console.error('Error submitting weekly report:', error);
            }
        }
    }
})();