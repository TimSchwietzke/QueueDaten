document.getElementById("startBtn").addEventListener("click", () => {
    document.getElementById("status").innerText = "Skript läuft...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["xlsx.full.min.js", "content.js"]
        });
    });
});