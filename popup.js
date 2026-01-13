function loadHKPopup(tabId, mode) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (selectedMode) => {
            window.QUEUE_EXPORT_MODE = selectedMode;
        },
        args: [mode]
    }, () => {

        chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["HelloKittyPopup.css"]
        });
        // ---------------------------

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["xlsx.full.min.js", "content.js"]
        });
    });
}

function setCursor(targets, customCursor) {
    targets.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (el.disabled) {
                customCursor.style.backgroundImage = "url('src/cursor/HelloKittyWait.gif')";
            } else {
                customCursor.style.backgroundImage = "url('src/cursor/HelloKittyLinkSelect.gif')";
            }

            customCursor.style.display = 'block';
        });

        el.addEventListener('mouseleave', () => {
            customCursor.style.display = 'none';
        });
    });
}
document.getElementById("startBtnQueue").addEventListener("click", () => {
    startExport("Queued");
});

document.getElementById("startBtnWatch").addEventListener("click", () => {
    startExport("Watched");
});

function startExport(mode) {
    const statusDiv = document.getElementById("status");

    const btnQueue = document.getElementById("startBtnQueue");
    const btnWatch = document.getElementById("startBtnWatch");

    btnQueue.disabled = true;
    btnWatch.disabled = true;

    const customCursor = document.getElementById('custom-cursor');
    customCursor.style.backgroundImage = "url('src/cursor/HelloKittyWait.gif')";

    statusDiv.innerText = `Starte Export für: ${mode}...`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        loadHKPopup(tabId, mode);
    });
}

document.addEventListener("DOMContentLoaded", function() {

    removeExistingHelloKittyPopup();

    const customCursor = document.getElementById('custom-cursor');
    const targets = document.querySelectorAll('button, #success-image, #fail-image');

    // 1. Cursor bewegt sich mit der Maus
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
    });

    // 2. Logik beim Hovern
    setCursor(targets, customCursor);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "JOB_DONE") {
        window.close();
    }
});

function removeExistingHelloKittyPopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Sicherheitscheck: Haben wir einen Tab?
        if (!tabs || tabs.length === 0) return;
        const tabId = tabs[0].id;

        // Wir injizieren ein Mini-Skript, das nur das Overlay löscht
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const existing = document.getElementById('hk-popup-overlay');
                if (existing) existing.remove();
            }
        }, () => {
            if (chrome.runtime.lastError) {
            }
        });
    });
}