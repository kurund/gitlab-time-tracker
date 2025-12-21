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
    const totalMinutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let text;
    if (hours > 0) {
      // 1h10, 2h30, etc.
      text = `${hours}h${minutes}`;
    } else if (totalMinutes > 0) {
      // 1m, 10m, 45m, etc.
      text = `${totalMinutes}m`;
    } else {
      // 1s, 30s, etc.
      text = `${seconds}s`;
    }

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#FC6D26" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

function broadcastTimerState() {
  chrome.storage.local.get("gitlabUrl", (result) => {
    if (!result.gitlabUrl) return;

    chrome.tabs.query({ url: `${result.gitlabUrl}/*` }, (tabs) => {
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

    // Keep only last 50 tasks
    recentTasks = recentTasks.slice(0, 50);

    chrome.storage.local.set({ recentTasks });
  });
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

function broadcastMessage(message, isError = false) {
  chrome.storage.local.get("gitlabUrl", (result) => {
    if (!result.gitlabUrl) return;

    chrome.tabs.query({ url: `${result.gitlabUrl}/*` }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "showMessage",
            message: message,
            isError: isError,
          })
          .catch(() => {});
      }
    });
  });
}

function postTimeToGitLab(issue, timeSpentInSeconds) {
  chrome.storage.local.get(["gitlabUrl", "apiToken"], (result) => {
    if (!result.gitlabUrl || !result.apiToken) {
      broadcastMessage(
        "Please set your GitLab URL and API token in settings.",
        true,
      );
      return;
    }

    const { gitlabUrl, apiToken } = result;
    const { projectId, id: issueId } = issue;
    const title = issue.title || "Issue";
    const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueId}/add_spent_time`;
    const duration = formatDuration(timeSpentInSeconds);

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": apiToken,
      },
      body: JSON.stringify({ duration }),
    })
      .then(async (response) => {
        let data;
        try {
          data = await response.json();
        } catch (e) {
          data = {};
        }

        if (!response.ok) {
          const errorMsg =
            data.message || data.error || `HTTP ${response.status}`;
          throw new Error(errorMsg);
        }

        broadcastMessage(`${duration} logged to #${issueId}`);
      })
      .catch((error) => {
        broadcastMessage(`Failed to log time: ${error.message}`, true);
      });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    // Stop current timer if running
    if (timerState.isRunning) {
      clearInterval(timerState.timerId);
      const timeSpent = Math.round((Date.now() - timerState.startTime) / 1000);
      postTimeToGitLab(timerState.issue, timeSpent);
      addToRecentTasks(timerState.issue, timeSpent);
    }

    // Start new timer
    timerState.isRunning = true;
    timerState.issue = request.issue;
    timerState.startTime = Date.now();
    timerState.timerId = setInterval(updateBadge, 1000);
    chrome.storage.local.set({ timerState });
    addToRecentTasks(request.issue, 0);
    broadcastTimerState();
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
  } else if (request.action === "cancelTimer") {
    if (timerState.isRunning) {
      clearInterval(timerState.timerId);
      const issue = timerState.issue;

      timerState.isRunning = false;
      timerState.issue = null;
      timerState.startTime = null;
      timerState.timerId = null;
      chrome.storage.local.set({ timerState });
      updateBadge();
      broadcastTimerState();
      broadcastMessage(`Timer cancelled for #${issue.id}`);
    }
    sendResponse({ status: "Timer cancelled" });
  } else if (request.action === "getTimerState") {
    sendResponse(timerState);
  } else if (request.action === "logTime") {
    // Manual time entry
    const { issue, duration } = request;
    chrome.storage.local.get(["gitlabUrl", "apiToken"], (result) => {
      if (!result.gitlabUrl || !result.apiToken) {
        sendResponse({
          success: false,
          error: "Please configure GitLab settings",
        });
        return;
      }

      const { gitlabUrl, apiToken } = result;
      const { projectId, id: issueId } = issue;
      const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueId}/add_spent_time`;

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": apiToken,
        },
        body: JSON.stringify({ duration }),
      })
        .then(async (response) => {
          let data;
          try {
            data = await response.json();
          } catch (e) {
            data = {};
          }

          if (!response.ok) {
            const errorMsg =
              data.message || data.error || `HTTP ${response.status}`;
            sendResponse({ success: false, error: errorMsg });
            return;
          }

          addToRecentTasks(issue, 0);
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
    });
    return true; // Keep channel open for async response
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
  registerContentScripts();
  injectContentScriptForGrantedOrigins();
});

// Also inject on install/update
chrome.runtime.onInstalled.addListener(() => {
  registerContentScripts();
  injectContentScriptForGrantedOrigins();
});

chrome.permissions.onAdded.addListener((permissions) => {
  if (permissions.origins && permissions.origins.length > 0) {
    registerContentScripts();
    injectContentScriptForGrantedOrigins();
  }
});

async function registerContentScripts() {
  // Unregister existing scripts first
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: ["gitlab-time-tracker"],
    });
  } catch (e) {
    // Ignore if not registered
  }

  // Get all granted origins
  chrome.permissions.getAll(async (permissions) => {
    const origins = permissions.origins || [];
    if (origins.length === 0) return;

    try {
      await chrome.scripting.registerContentScripts([
        {
          id: "gitlab-time-tracker",
          matches: origins,
          js: ["content.js"],
          runAt: "document_idle",
        },
      ]);
    } catch (err) {
      // Ignore registration errors
    }
  });
}

function injectContentScriptForGrantedOrigins() {
  chrome.permissions.getAll((permissions) => {
    const origins = permissions.origins || [];
    for (const origin of origins) {
      chrome.tabs.query({ url: origin }, (tabs) => {
        for (const tab of tabs) {
          chrome.scripting
            .executeScript({
              target: { tabId: tab.id },
              files: ["content.js"],
            })
            .catch(() => {});
        }
      });
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    (changeInfo.status === "loading" || changeInfo.status === "complete") &&
    tab.url
  ) {
    chrome.permissions.getAll((permissions) => {
      const origins = permissions.origins || [];
      for (const origin of origins) {
        const originPrefix = origin.replace(/\*$/, "");
        if (tab.url.startsWith(originPrefix)) {
          chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              files: ["content.js"],
            })
            .catch(() => {});
          break;
        }
      }
    });
  }
});
