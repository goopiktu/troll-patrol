browser.runtime.sendMessage({ type: "getCommenter" }, (response) => {
    if (response && response.name) {
        console.log("Reported Commenter:", response.name);
        alert("Reporting: " + response.name);
    } else {
        console.log("No commenter selected.");
        alert("No commenter selected.");
    }
});
