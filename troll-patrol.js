document.body.style.border = "5px solid red";


// Adds an item to the Bloom filter, checks if the item exists 
// (should return true) and saves the Bloom filter to local storage.
// Then, create a new Bloom filter loaded from local storage
// to check if the item exists in the new Bloom filter.
(async () => {
    const bloomFilter = new BloomFilter(1000, 5);
    bloomFilter.add("DLSU.Manila.100");
    console.log(bloomFilter.check("DLSU.Manila.100"));
    await bloomFilter.save("facebookIDs");
    const newBloomFilter = new BloomFilter(1000, 5);
    await newBloomFilter.load("facebookIDs");
    console.log(newBloomFilter.check("DLSU.Manila.100"));
})();