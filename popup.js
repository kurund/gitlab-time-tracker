// popup.js

const timerDisplay = document.getElementById("timer-display");
const taskList = document.getElementById("task-list");
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search");

let timerInterval;
let gitlabUrl = "";
let allTasks = [];

// Icons
const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const stopIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`;
const starIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const starFilledIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const plusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
const deleteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (totalMinutes > 0) {
    return `${totalMinutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function getIssueUrl(issue) {
  if (issue.url) return issue.url;
  if (!gitlabUrl || !issue.projectId || !issue.id) return "#";
  return `${gitlabUrl}/-/projects/${issue.projectId}/issues/${issue.id}`;
}

function showMessage(message, isError = false) {
  const existing = document.getElementById("popup-message");
  if (existing) existing.remove();

  const msgEl = document.createElement("div");
  msgEl.id = "popup-message";
  msgEl.className = `message ${isError ? "error" : "success"}`;
  msgEl.textContent = message;

  timerDisplay.parentNode.insertBefore(msgEl, timerDisplay);

  setTimeout(() => {
    if (msgEl.parentNode) msgEl.remove();
  }, 5000);
}

function updateTimerDisplay(timerState) {
  if (timerState && timerState.isRunning) {
    if (timerInterval) clearInterval(timerInterval);

    const update = () => {
      const elapsed = Date.now() - timerState.startTime;
      timerDisplay.innerHTML = ""; // Clear the display

      const timerActive = document.createElement("div");
      timerActive.className = "timer-active";

      const timerIssue = document.createElement("div");
      timerIssue.className = "timer-issue";

      const issueLink = document.createElement("a");
      issueLink.href = getIssueUrl(timerState.issue);
      issueLink.target = "_blank";
      issueLink.title = timerState.issue.title;
      issueLink.textContent = `${timerState.issue.title} (#${timerState.issue.id})`;

      timerIssue.appendChild(issueLink);

      const timerTime = document.createElement("div");
      timerTime.className = "timer-time";
      timerTime.textContent = formatTime(elapsed);

      const timerActions = document.createElement("div");
      timerActions.className = "timer-actions";

      const stopButton = document.createElement("button");
      stopButton.id = "stop-button";
      stopButton.className = "btn btn-stop";
      stopButton.innerHTML = `${stopIcon} Stop`;
      stopButton.onclick = () => {
        chrome.runtime.sendMessage({ action: "stopTimer" }, () => {
          if (timerInterval) clearInterval(timerInterval);
          updateTimerDisplay(null);
          loadTasks();
        });
      };

      const cancelButton = document.createElement("button");
      cancelButton.id = "cancel-button";
      cancelButton.className = "cancel-link";
      cancelButton.textContent = "Cancel";
      cancelButton.onclick = () => {
        chrome.runtime.sendMessage({ action: "cancelTimer" }, () => {
          if (timerInterval) clearInterval(timerInterval);
          updateTimerDisplay(null);
        });
      };

      timerActions.appendChild(stopButton);
      timerActions.appendChild(cancelButton);

      timerActive.appendChild(timerIssue);
      timerActive.appendChild(timerTime);
      timerActive.appendChild(timerActions);

      timerDisplay.appendChild(timerActive);
    };

    update();
    timerInterval = setInterval(update, 1000);
  } else {
    if (timerInterval) clearInterval(timerInterval);
    timerDisplay.innerHTML = '<div class="no-timer">No timer running</div>';
  }
}

function createTaskItem(task, isFavorite) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.taskId = `${task.projectId}-${task.id}`;

  const taskRow = document.createElement("div");
  taskRow.className = "task-row";

  // Favorite button in front
  const favBtn = document.createElement("button");
  favBtn.className = `icon-btn fav-btn ${isFavorite ? "favorite" : ""}`;
  favBtn.innerHTML = isFavorite ? starFilledIcon : starIcon;
  favBtn.title = isFavorite ? "Remove from Favorites" : "Add to Favorites";
  favBtn.onclick = () => toggleFavorite(task, !isFavorite);

  const taskInfo = document.createElement("div");
  taskInfo.className = "task-info";

  const taskTitle = document.createElement("div");
  taskTitle.className = "task-title";
  const link = document.createElement("a");
  link.href = getIssueUrl(task);
  link.target = "_blank";
  link.textContent = `${task.title} (#${task.id})`;
  link.title = task.title;
  taskTitle.appendChild(link);

  const taskMeta = document.createElement("div");
  taskMeta.className = "task-meta";
  const metaParts = [];
  if (task.projectName) {
    metaParts.push(task.projectName);
  }
  if (task.lastTracked) {
    const date = new Date(task.lastTracked);
    metaParts.push(date.toLocaleDateString());
  }
  taskMeta.textContent = metaParts.join(" - ");

  taskInfo.appendChild(taskTitle);
  taskInfo.appendChild(taskMeta);

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  // Add time button
  const addTimeBtn = document.createElement("button");
  addTimeBtn.className = "icon-btn";
  addTimeBtn.innerHTML = plusIcon;
  addTimeBtn.title = "Add Time";
  addTimeBtn.onclick = () => toggleTimeEntry(li, task);

  // Play button
  const playBtn = document.createElement("button");
  playBtn.className = "icon-btn";
  playBtn.innerHTML = playIcon;
  playBtn.title = "Start Timer";
  playBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: "startTimer", issue: task }, () => {
      chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
        updateTimerDisplay(response);
      });
    });
  };

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete";
  deleteBtn.innerHTML = deleteIcon;
  deleteBtn.title = "Remove from list";
  deleteBtn.onclick = () => deleteTask(task);

  taskActions.appendChild(playBtn);
  taskActions.appendChild(addTimeBtn);
  taskActions.appendChild(deleteBtn);

  taskRow.appendChild(favBtn);
  taskRow.appendChild(taskInfo);
  taskRow.appendChild(taskActions);

  li.appendChild(taskRow);

  return li;
}

function toggleTimeEntry(li, task) {
  const existing = li.querySelector(".time-entry");
  if (existing) {
    existing.remove();
    return;
  }

  // Close any other open time entries
  document.querySelectorAll(".time-entry").forEach((el) => el.remove());

  const timeEntry = document.createElement("div");
  timeEntry.className = "time-entry";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "e.g., 1h 30m";
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitTime();
  });

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn btn-start btn-sm";
  submitBtn.textContent = "Log";
  submitBtn.onclick = submitTime;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-sm";
  cancelBtn.style.background = "#ddd";
  cancelBtn.style.color = "#333";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => timeEntry.remove();

  function submitTime() {
    const duration = input.value.trim();
    if (!duration) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "...";

    chrome.runtime.sendMessage(
      { action: "logTime", issue: task, duration: duration },
      (response) => {
        if (response && response.success) {
          showMessage(`${duration} logged to #${task.id}`);
          timeEntry.remove();
        } else {
          showMessage(response?.error || "Failed to log time", true);
          submitBtn.disabled = false;
          submitBtn.textContent = "Log";
        }
      },
    );
  }

  timeEntry.appendChild(input);
  timeEntry.appendChild(submitBtn);
  timeEntry.appendChild(cancelBtn);

  li.appendChild(timeEntry);
  input.focus();
}

function deleteTask(task) {
  chrome.storage.local.get(["recentTasks", "favorites"], (result) => {
    let recentTasks = result.recentTasks || [];
    let favorites = result.favorites || [];
    const taskKey = `${task.projectId}-${task.id}`;

    recentTasks = recentTasks.filter(
      (t) => `${t.projectId}-${t.id}` !== taskKey,
    );
    favorites = favorites.filter((t) => `${t.projectId}-${t.id}` !== taskKey);

    chrome.storage.local.set({ recentTasks, favorites }, () => {
      loadTasks();
    });
  });
}

function toggleFavorite(task, add) {
  chrome.storage.local.get(["favorites"], (result) => {
    let favorites = result.favorites || [];
    const taskKey = `${task.projectId}-${task.id}`;

    if (add) {
      const exists = favorites.some(
        (f) => `${f.projectId}-${f.id}` === taskKey,
      );
      if (!exists) {
        favorites.unshift(task);
      }
    } else {
      favorites = favorites.filter((f) => `${f.projectId}-${f.id}` !== taskKey);
    }

    chrome.storage.local.set({ favorites }, () => {
      loadTasks();
    });
  });
}

function loadTasks() {
  chrome.storage.local.get(["recentTasks", "favorites"], (result) => {
    const recentTasks = result.recentTasks || [];
    const favorites = result.favorites || [];
    const favoriteIds = new Set(favorites.map((f) => `${f.projectId}-${f.id}`));

    // Merge favorites with their latest timestamps from recentTasks
    const taskMap = new Map();

    // Add all recent tasks to map
    for (const task of recentTasks) {
      const taskKey = `${task.projectId}-${task.id}`;
      taskMap.set(taskKey, { ...task, isFavorite: favoriteIds.has(taskKey) });
    }

    // Add favorites that aren't in recent tasks
    for (const fav of favorites) {
      const taskKey = `${fav.projectId}-${fav.id}`;
      if (!taskMap.has(taskKey)) {
        taskMap.set(taskKey, { ...fav, isFavorite: true });
      }
    }

    // Convert to array and sort: favorites first (sorted by time), then others (sorted by time)
    allTasks = Array.from(taskMap.values()).sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Within same group, sort by lastTracked (most recent first)
      return (b.lastTracked || 0) - (a.lastTracked || 0);
    });

    renderTasks(allTasks);
  });
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty-state">No issues found.</li>';
    return;
  }

  tasks.forEach((task) => {
    taskList.appendChild(createTaskItem(task, task.isFavorite));
  });
}

function filterTasks(query) {
  const q = query.toLowerCase();
  const filtered = allTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(q) || task.id.toString().includes(q),
  );
  renderTasks(filtered);

  // Show/hide clear button
  clearSearchBtn.classList.toggle("visible", query.length > 0);
}

// Search functionality
searchInput.addEventListener("input", (e) => {
  filterTasks(e.target.value);
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterTasks("");
  searchInput.focus();
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Load GitLab URL
  chrome.storage.local.get(["gitlabUrl"], (result) => {
    gitlabUrl = result.gitlabUrl || "";
  });

  // Load timer state
  chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
    if (chrome.runtime.lastError) {
      timerDisplay.innerHTML =
        '<div class="no-timer">Error loading timer</div>';
      return;
    }
    updateTimerDisplay(response);
  });

  // Load tasks
  loadTasks();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.recentTasks || changes.favorites) {
      loadTasks();
    }
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "showMessage") {
    showMessage(request.message, request.isError);
  }
});

// Tab switching
const tabs = document.querySelectorAll(".tab");
const tasksContent = document.getElementById("tasks-content");
const statsContent = document.getElementById("stats-content");

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatStatsDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function loadStats() {
  chrome.storage.local.get(["timeHistory"], (result) => {
    const history = result.timeHistory || [];
    const now = new Date();
    const weekStart = getStartOfWeek(now).getTime();
    const monthStart = getStartOfMonth(now).getTime();

    let weeklySeconds = 0;
    let monthlySeconds = 0;

    for (const entry of history) {
      if (entry.timestamp >= weekStart) weeklySeconds += entry.duration;
      if (entry.timestamp >= monthStart) monthlySeconds += entry.duration;
    }

    document.getElementById("weekly-hours").textContent =
      formatStatsDuration(weeklySeconds);
    document.getElementById("monthly-hours").textContent =
      formatStatsDuration(monthlySeconds);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const tabName = tab.dataset.tab;
    if (tabName === "tasks") {
      tasksContent.style.display = "block";
      statsContent.style.display = "none";
    } else if (tabName === "stats") {
      tasksContent.style.display = "none";
      statsContent.style.display = "grid";
      loadStats();
    }
  });
});

// Settings view toggle
const tasksView = document.getElementById("tasks-view");
const settingsView = document.getElementById("settings-view");
const openSettingsBtn = document.getElementById("open-settings");
const backToTasksBtn = document.getElementById("back-to-tasks");
const gitlabUrlInput = document.getElementById("gitlab-url");
const apiTokenInput = document.getElementById("api-token");
const saveSettingsBtn = document.getElementById("save-settings");
const settingsMessage = document.getElementById("settings-message");
const permissionStatus = document.getElementById("permission-status");
const requestPermissionBtn = document.getElementById("request-permission-btn");

function showSettingsView() {
  tasksView.classList.remove("active");
  settingsView.classList.add("active");
  loadSettings();
}

function showTasksView() {
  settingsView.classList.remove("active");
  tasksView.classList.add("active");
}

function loadSettings() {
  chrome.storage.local.get(["gitlabUrl", "apiToken"], (result) => {
    gitlabUrlInput.value = result.gitlabUrl || "";
    apiTokenInput.value = result.apiToken || "";
    updatePermissionStatus();
  });
}

function updatePermissionStatus() {
  const url = gitlabUrlInput.value.trim();
  if (!url) {
    permissionStatus.textContent = "Enter a GitLab URL to request permission.";
    permissionStatus.style.color = "#888";
    requestPermissionBtn.disabled = true;
    return;
  }

  const origin = new URL(url).origin + "/*";
  chrome.permissions.contains({ origins: [origin] }, (granted) => {
    if (granted) {
      permissionStatus.textContent = `Permission granted for ${url}`;
      permissionStatus.style.color = "#2e7d32";
      requestPermissionBtn.textContent = "Permission Granted";
      requestPermissionBtn.disabled = true;
    } else {
      permissionStatus.textContent = `Permission not granted for ${url}`;
      permissionStatus.style.color = "#c62828";
      requestPermissionBtn.textContent = "Request Permission";
      requestPermissionBtn.disabled = false;
    }
  });
}

function requestPermission() {
  const url = gitlabUrlInput.value.trim();
  if (!url) {
    showSettingsMessage("Please enter a GitLab URL first.", true);
    return;
  }

  const origin = new URL(url).origin + "/*";
  chrome.permissions.request({ origins: [origin] }, (granted) => {
    if (granted) {
      showSettingsMessage("Permission granted!");
    } else {
      showSettingsMessage("Permission was not granted.", true);
    }
    updatePermissionStatus();
  });
}

function saveSettings() {
  const newGitlabUrl = gitlabUrlInput.value.trim().replace(/\/$/, ""); // Remove trailing slash
  const newApiToken = apiTokenInput.value.trim();

  if (!newGitlabUrl) {
    showSettingsMessage("Please enter a GitLab URL", true);
    return;
  }

  chrome.storage.local.set(
    { gitlabUrl: newGitlabUrl, apiToken: newApiToken },
    () => {
      gitlabUrl = newGitlabUrl;
      showSettingsMessage("Settings saved!");
      updatePermissionStatus();
      setTimeout(() => {
        // Do not automatically close, let user request permission
        // showTasksView();
      }, 1000);
    },
  );
}

function showSettingsMessage(message, isError = false) {
  settingsMessage.textContent = message;
  settingsMessage.className = `message ${isError ? "error" : "success"}`;
  settingsMessage.style.marginTop = "12px";

  setTimeout(() => {
    settingsMessage.textContent = "";
    settingsMessage.className = "";
  }, 3000);
}

openSettingsBtn.addEventListener("click", showSettingsView);
backToTasksBtn.addEventListener("click", showTasksView);
saveSettingsBtn.addEventListener("click", saveSettings);
gitlabUrlInput.addEventListener("input", updatePermissionStatus);
requestPermissionBtn.addEventListener("click", requestPermission);
