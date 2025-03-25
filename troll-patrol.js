// document.body.style.border = "5px solid red";

const bloomFilter = new BloomFilter(492320, 5);
window.bloomFilter = bloomFilter;
bloomFilter.updateFromGitHub("https://raw.githubusercontent.com/goopiktu/troll-patrol-reportedUsers/refs/heads/main/reportedUsers.json");