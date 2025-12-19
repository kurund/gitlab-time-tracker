// background.js

let timerState = {
  isRunning: false,
  issue: null,
  startTime: null,
  timerId: null,
};

function updateBadge() {
  if (timerState.isRunning) {
    const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const text = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    chrome.action.setBadgeText({ text });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

function broadcastTimerState() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "timerStateChanged",
          timerState: {
            isRunning: timerState.isRunning,
            issue: timerState.issue,
          },
        })
        .catch(() => {});
    }
  });
}

function addToRecentTasks(issue, timeSpent) {
  chrome.storage.local.get(["recentTasks"], (result) => {
    let recentTasks = result.recentTasks || [];

    // Create task entry with timestamp
    const taskEntry = {
      ...issue,
      lastTracked: Date.now(),
      lastTimeSpent: timeSpent,
    };

    // Remove existing entry for same issue
    recentTasks = recentTasks.filter(
      (t) => !(t.projectId === issue.projectId && t.id === issue.id),
    );

    // Add to beginning
    recentTasks.unshift(taskEntry);

    // Keep only last 10 tasks
    recentTasks = recentTasks.slice(0, 10);

    chrome.storage.local.set({ recentTasks });
  });
}

function postTimeToGitLab(issue, timeSpentInSeconds) {
  chrome.storage.sync.get(["gitlabUrl", "apiToken"], (result) => {
    if (result.gitlabUrl && result.apiToken) {
      const { gitlabUrl, apiToken } = result;
      const { projectId, id: issueId } = issue;
      const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueId}/add_spent_time`;

      const hours = Math.floor(timeSpentInSeconds / 3600);
      const minutes = Math.floor((timeSpentInSeconds % 3600) / 60);
      const seconds = timeSpentInSeconds % 60;
      const duration = `${hours}h ${minutes}m ${seconds}s`;

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": apiToken,
        },
        body: JSON.stringify({ duration }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Time added successfully:", data);
        })
        .catch((error) => {
          console.error("Error adding time:", error);
        });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    if (!timerState.isRunning) {
      timerState.isRunning = true;
      timerState.issue = request.issue;
      timerState.startTime = Date.now();
      timerState.timerId = setInterval(updateBadge, 1000);
      chrome.storage.local.set({ timerState });
      broadcastTimerState();
    }
    sendResponse({ status: "Timer started" });
  } else if (request.action === "stopTimer") {
    if (timerState.isRunning) {
      clearInterval(timerState.timerId);
      const endTime = Date.now();
      const timeSpent = Math.round((endTime - timerState.startTime) / 1000);

      postTimeToGitLab(timerState.issue, timeSpent);
      addToRecentTasks(timerState.issue, timeSpent);

      timerState.isRunning = false;
      timerState.issue = null;
      timerState.startTime = null;
      timerState.timerId = null;
      chrome.storage.local.set({ timerState });
      updateBadge();
      broadcastTimerState();
    }
    sendResponse({ status: "Timer stopped" });
  } else if (request.action === "getTimerState") {
    sendResponse(timerState);
  }
  return true; // Keep the message channel open for async response
});

// Restore timer state on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("timerState", (data) => {
    if (data.timerState && data.timerState.isRunning) {
      timerState = data.timerState;
      // Recalculate and start interval
      const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
      if (elapsed > 0) {
        timerState.timerId = setInterval(updateBadge, 1000);
      }
    }
  });
});
