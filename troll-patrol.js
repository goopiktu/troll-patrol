// document.body.style.border = "5px solid red";

const bloomFilter = new BloomFilter(492320, 5);
window.bloomFilter = bloomFilter;
// TODO: edit to include version number as variable
bloomFilter.updateFromGitHub("https://raw.githubusercontent.com/ramonmapua/troll_patrol_filters/refs/heads/main/bloomfilter-2025-03-25.json");