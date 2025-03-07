// Load BloomFilter from bloomfilter.js
const bloomFilter = new BloomFilter(1000, 5);

console.log("Initializing Bloom Filter...");

// Load existing Bloom Filter data from storage
browser.storage.local.get("reportedUsers", (result) => {
    if (result.reportedUsers) {
        console.log("Loading Bloom Filter from storage...");
        bloomFilter.fromJSON(result.reportedUsers);
    } else {
        console.log("No existing Bloom Filter data found, starting fresh.");
    }
    console.log("Bloom Filter Loaded.");
});

// Function to save Bloom Filter to local storage
function saveBloomFilter() {
    const serializedData = bloomFilter.toJSON();
    browser.storage.local.set({ reportedUsers: serializedData }, () => {
        console.log("Bloom Filter saved to local storage.");
    });
}

// Make these globally accessible
window.bloomFilter = bloomFilter;
window.saveBloomFilter = saveBloomFilter;
