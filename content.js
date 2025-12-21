// Prevent multiple injections
if (window.gitlabTimeTrackerInjected) {
  // Already injected, skip
} else {
  window.gitlabTimeTrackerInjected = true;

  function getIssueDetails() {
    // Check if we're on an issue page
    const isIssuePage =
      document.body.dataset.page === "projects:issues:show" ||
      document.querySelector('.breadcrumbs-list li a[href$="/issues"]') ||
      window.location.pathname.includes("/issues/");

    if (!isIssuePage) {
      return null;
    }

    // Try multiple selectors to find the title
    const titleSelectors = [
      'h1[data-testid="work-item-title"] span',
      'h1[data-testid="issue-title"] span',
      'h1[data-testid="work-item-title"]',
      'h1[data-testid="issue-title"]',
      ".issue-details h1.title",
      ".detail-page-header h1",
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        title = element.innerText?.trim();
        if (title) break;
      }
    }

    // Get issue ID from URL
    let issueId = null;
    const match = window.location.pathname.match(/issues\/(\d+)/);
    if (match) {
      issueId = match[1];
    }

    const projectId = document.body.dataset.projectId;

    if (title && issueId) {
      const issueDetails = {
        title: title,
        id: issueId,
        projectId: projectId,
        url: window.location.href,
      };
      return issueDetails;
    }
    return null;
  }

  const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`;

  function safeSendMessage(message, callback) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          window.location.reload();
          return;
        }
        if (callback) callback(response);
      });
    } catch (error) {
      window.location.reload();
    }
  }

  function updateButtonState(button, isRunning, issueDetails) {
    // Remove existing cancel button if any
    const existingCancel = document.getElementById(
      "gitlab-timer-cancel-button",
    );
    if (existingCancel) existingCancel.remove();

    if (isRunning) {
      button.innerHTML = stopIcon;
      button.title = "Stop & Log Time";
      button.style.backgroundColor = "#554488";
      button.style.borderColor = "#554488";
      button.style.color = "#fff";
      button.onclick = () => {
        safeSendMessage({ action: "stopTimer" }, () => {
          updateButtonState(button, false, issueDetails);
        });
      };

      // Add cancel button
      const cancelBtn = document.createElement("button");
      cancelBtn.id = "gitlab-timer-cancel-button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.title = "Cancel timer without logging";
      cancelBtn.style.cssText =
        "vertical-align: middle; margin-left: 6px; cursor: pointer; border-radius: 4px; padding: 4px 8px; border: none; background: none; color: #888; font-size: 12px;";
      cancelBtn.onmouseover = () => {
        cancelBtn.style.color = "#554488";
      };
      cancelBtn.onmouseout = () => {
        cancelBtn.style.color = "#888";
      };
      cancelBtn.onclick = () => {
        safeSendMessage({ action: "cancelTimer" }, () => {
          updateButtonState(button, false, issueDetails);
        });
      };
      button.parentNode.insertBefore(cancelBtn, button.nextSibling);
    } else {
      button.innerHTML = playIcon;
      button.title = "Start Timer";
      button.style.backgroundColor = "#FC6D26";
      button.style.borderColor = "#FC6D26";
      button.style.color = "#fff";
      button.onclick = () => {
        safeSendMessage(
          {
            action: "startTimer",
            issue: issueDetails,
          },
          () => {
            updateButtonState(button, true, issueDetails);
          },
        );
      };
    }
  }

  function injectStartButton() {
    const issueDetails = getIssueDetails();
    if (issueDetails && !document.getElementById("gitlab-timer-start-button")) {
      // Try multiple selectors to find the title element
      const titleSelectors = [
        'h1[data-testid="work-item-title"]',
        'h1[data-testid="issue-title"]',
        ".issue-details h1.title",
        ".detail-page-header h1",
      ];

      let titleElement = null;
      for (const selector of titleSelectors) {
        titleElement = document.querySelector(selector);
        if (titleElement) break;
      }

      if (titleElement) {
        const button = document.createElement("button");
        button.id = "gitlab-timer-start-button";
        button.style.cssText =
          "vertical-align: middle; margin-left: 8px; cursor: pointer; border-radius: 4px; padding: 4px 6px; border: none; display: inline-flex; align-items: center; justify-content: center;";

        // Check current timer state and set button accordingly
        safeSendMessage({ action: "getTimerState" }, (response) => {
          const isRunning =
            response &&
            response.isRunning &&
            response.issue &&
            response.issue.id === issueDetails.id;
          updateButtonState(button, isRunning, issueDetails);
        });

        // Insert button inside the h1, after the title text span
        const titleSpan = titleElement.querySelector("span");
        if (titleSpan) {
          titleSpan.parentNode.insertBefore(button, titleSpan.nextSibling);
        } else {
          titleElement.appendChild(button);
        }
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        injectStartButton();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  function showInlineMessage(message, isError = false) {
    // Remove existing message
    const existing = document.getElementById("gitlab-timer-message");
    if (existing) existing.remove();

    const button = document.getElementById("gitlab-timer-start-button");
    if (!button) return;

    const msgEl = document.createElement("span");
    msgEl.id = "gitlab-timer-message";
    msgEl.textContent = message;
    msgEl.style.cssText = `
      margin-left: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background: ${isError ? "#fde8e8" : "#e8f5e9"};
      color: ${isError ? "#c62828" : "#2e7d32"};
      vertical-align: middle;
    `;

    button.parentNode.insertBefore(msgEl, button.nextSibling);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (msgEl.parentNode) msgEl.remove();
    }, 5000);
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "timerStateChanged") {
      const button = document.getElementById("gitlab-timer-start-button");
      if (button) {
        const issueDetails = getIssueDetails();
        if (issueDetails) {
          const isRunning =
            request.timerState.isRunning &&
            request.timerState.issue &&
            request.timerState.issue.id === issueDetails.id;
          updateButtonState(button, isRunning, issueDetails);
        }
      }
    } else if (request.action === "showMessage") {
      showInlineMessage(request.message, request.isError);
    }
  });

  // Also run on load
  injectStartButton();
}
