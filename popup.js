// popup.js

const timerDisplay = document.getElementById("timer-display");
const recentTasksList = document.getElementById("recent-tasks");
const favoriteTasksList = document.getElementById("favorite-tasks");

let timerInterval;
let gitlabUrl = "";

// Icons
const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const stopIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`;
const starIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const starFilledIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getIssueUrl(issue) {
  if (issue.url) return issue.url;
  if (!gitlabUrl || !issue.projectId || !issue.id) return "#";
  return `${gitlabUrl}/-/projects/${issue.projectId}/issues/${issue.id}`;
}

function showMessage(message, isError = false) {
  // Remove existing message
  const existing = document.getElementById("popup-message");
  if (existing) existing.remove();

  const msgEl = document.createElement("div");
  msgEl.id = "popup-message";
  msgEl.textContent = message;
  msgEl.style.cssText = `
    padding: 8px 12px;
    margin: 0 0 8px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: ${isError ? "#fde8e8" : "#e8f5e9"};
    color: ${isError ? "#c62828" : "#2e7d32"};
    text-align: center;
  `;

  timerDisplay.parentNode.insertBefore(msgEl, timerDisplay);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (msgEl.parentNode) msgEl.remove();
  }, 5000);
}

function updateTimerDisplay(timerState) {
  if (timerState && timerState.isRunning) {
    if (timerInterval) clearInterval(timerInterval);

    const update = () => {
      const elapsed = Date.now() - timerState.startTime;
      timerDisplay.innerHTML = `
        <div class="timer-active">
          <div class="timer-issue">
            <a href="${getIssueUrl(timerState.issue)}" target="_blank" title="${timerState.issue.title}">
              ${timerState.issue.title} (#${timerState.issue.id})
            </a>
          </div>
          <div class="timer-time">${formatTime(elapsed)}</div>
          <div class="timer-actions">
            <button id="stop-button" class="btn btn-stop">
              ${stopIcon} Stop Timer
            </button>
          </div>
        </div>
      `;
      document.getElementById("stop-button").onclick = () => {
        chrome.runtime.sendMessage({ action: "stopTimer" }, () => {
          if (timerInterval) clearInterval(timerInterval);
          updateTimerDisplay(null);
          loadRecentTasks();
        });
      };
    };

    update();
    timerInterval = setInterval(update, 1000);
  } else {
    if (timerInterval) clearInterval(timerInterval);
    timerDisplay.innerHTML = '<div class="no-timer">No timer running</div>';
  }
}

function createTaskItem(task, isFavorite, showFavoriteBtn = true) {
  const li = document.createElement("li");
  li.className = "task-item";

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
  if (task.lastTracked) {
    const date = new Date(task.lastTracked);
    taskMeta.textContent = date.toLocaleDateString();
  }

  taskInfo.appendChild(taskTitle);
  taskInfo.appendChild(taskMeta);

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  // Play button to start timer
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

  // Favorite button
  if (showFavoriteBtn) {
    const favBtn = document.createElement("button");
    favBtn.className = `icon-btn ${isFavorite ? "favorite" : ""}`;
    favBtn.innerHTML = isFavorite ? starFilledIcon : starIcon;
    favBtn.title = isFavorite ? "Remove from Favorites" : "Add to Favorites";
    favBtn.onclick = () => {
      toggleFavorite(task, !isFavorite);
    };
    taskActions.appendChild(favBtn);
  }

  taskActions.appendChild(playBtn);
  li.appendChild(taskInfo);
  li.appendChild(taskActions);

  return li;
}

function loadRecentTasks() {
  chrome.storage.local.get(["recentTasks", "favorites"], (result) => {
    const recentTasks = result.recentTasks || [];
    const favorites = result.favorites || [];
    const favoriteIds = new Set(favorites.map((f) => `${f.projectId}-${f.id}`));

    recentTasksList.innerHTML = "";

    if (recentTasks.length === 0) {
      recentTasksList.innerHTML =
        '<li class="empty-state">No recent tasks</li>';
      return;
    }

    recentTasks.slice(0, 5).forEach((task) => {
      const taskKey = `${task.projectId}-${task.id}`;
      const isFavorite = favoriteIds.has(taskKey);
      recentTasksList.appendChild(createTaskItem(task, isFavorite));
    });
  });
}

function loadFavorites() {
  chrome.storage.local.get(["favorites"], (result) => {
    const favorites = result.favorites || [];

    favoriteTasksList.innerHTML = "";

    if (favorites.length === 0) {
      favoriteTasksList.innerHTML =
        '<li class="empty-state">No favorites yet</li>';
      return;
    }

    favorites.forEach((task) => {
      favoriteTasksList.appendChild(createTaskItem(task, true, false));
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
      loadRecentTasks();
      loadFavorites();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Load GitLab URL
  chrome.storage.sync.get(["gitlabUrl"], (result) => {
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

  // Load recent tasks and favorites
  loadRecentTasks();
  loadFavorites();
});

// Listen for storage changes to update lists automatically
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.recentTasks) {
      loadRecentTasks();
    }
    if (changes.favorites) {
      loadFavorites();
    }
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "showMessage") {
    showMessage(request.message, request.isError);
  }
});
