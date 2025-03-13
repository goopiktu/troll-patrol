document.body.style.border = "5px solid red";

const bloomFilter = new BloomFilter(1000, 5);

// replace this with pull from db
bloomFilter.add("DLSU.Manila.100");
bloomFilter.save("reportedUsers"); 
bloomFilter.load("reportedUsers");

// make this globally accessible
window.bloomFilter = bloomFilter;