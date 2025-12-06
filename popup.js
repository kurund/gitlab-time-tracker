// popup.js

const timerDisplay = document.getElementById("timer-display");
let timerInterval;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function updatePopup(timerState) {
  if (timerState.isRunning) {
    if (timerInterval) clearInterval(timerInterval);

    const update = () => {
      const elapsed = Date.now() - timerState.startTime;
      timerDisplay.innerHTML = `
                <div class="timer-info">
                    <strong>Currently Running:</strong><br>
                    ${timerState.issue.title} (#${timerState.issue.id})
                    <br>
                    <strong>Time:</strong> ${formatTime(elapsed)}
                </div>
                <div class="timer-actions">
                    <button id="stop-button">Stop Timer</button>
                </div>
            `;
      document.getElementById("stop-button").onclick = () => {
        chrome.runtime.sendMessage({ action: "stopTimer" }, () => {
          window.close();
        });
      };
    };

    update();
    timerInterval = setInterval(update, 1000);
  } else {
    if (timerInterval) clearInterval(timerInterval);
    timerDisplay.innerHTML = '<div class="no-timer">No timer running.</div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
    if (chrome.runtime.lastError) {
      // Handle error, e.g., background script not ready
      timerDisplay.innerHTML =
        '<div class="no-timer">Error loading timer state.</div>';
      return;
    }
    updatePopup(response);
  });
});
