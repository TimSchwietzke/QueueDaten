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

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (selectedMode) => {
                window.QUEUE_EXPORT_MODE = selectedMode;
            },
            args: [mode]
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["xlsx.full.min.js", "content.js"]
            });
        });
    });
}

document.getElementById("startBtnQueue").addEventListener("click", () => {
    startExport("Queued");
});

document.getElementById("startBtnWatch").addEventListener("click", () => {
    startExport("Watched");
});

document.addEventListener("DOMContentLoaded", function() {
    const customCursor = document.getElementById('custom-cursor');
    const targets = document.querySelectorAll('button, #success-image, #fail-image');

    // 1. Cursor bewegt sich mit der Maus
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
    });

    // 2. Logik beim Hovern
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
});