chrome.storage.sync.get(["gitlabUrl"], (result) => {
  const gitlabUrl = result.gitlabUrl;
  console.log("GitLab URL from settings:", gitlabUrl);
  console.log("Current URL:", window.location.href);
  console.log(
    "Does current URL start with GitLab URL?",
    window.location.href.startsWith(gitlabUrl),
  );

  if (gitlabUrl && window.location.href.startsWith(gitlabUrl)) {
    function getIssueDetails() {
      const isIssuePage =
        document.body.dataset.page === "projects:issues:show" ||
        document.querySelector('.breadcrumbs-list li a[href$="/issues"]');
      console.log("Is this an issue page?", isIssuePage);

      if (!isIssuePage) {
        return null;
      }

      let titleElement = document.querySelector(
        'h1[data-testid="work-item-title"] span',
      );
      let title = null;

      if (titleElement) {
        title = titleElement.innerText;
      }

      let issueId = null;
      const match = window.location.pathname.match(/issues\/(\d+)/);
      if (match) {
        issueId = match[1];
      }

      const projectId = document.body.dataset.projectId;

      console.log("Title:", title);
      console.log("Issue ID:", issueId);
      console.log("Project ID:", projectId);

      if (title && issueId) {
        const issueDetails = {
          title: title,
          id: issueId,
          projectId: projectId,
          url: window.location.href,
        };
        console.log("Issue details found:", issueDetails);
        return issueDetails;
      }
      console.log("Could not find all issue details.");
      return null;
    }

    const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`;

    function safeSendMessage(message, callback) {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.log("Extension context invalidated, reloading page...");
            window.location.reload();
            return;
          }
          if (callback) callback(response);
        });
      } catch (error) {
        console.log("Extension context invalidated, reloading page...");
        window.location.reload();
      }
    }

    function updateButtonState(button, isRunning, issueDetails) {
      if (isRunning) {
        button.innerHTML = stopIcon;
        button.title = "Stop Timer";
        button.style.backgroundColor = "#dc3545";
        button.style.borderColor = "#dc3545";
        button.style.color = "#fff";
        button.onclick = () => {
          safeSendMessage({ action: "stopTimer" }, () => {
            updateButtonState(button, false, issueDetails);
          });
        };
      } else {
        button.innerHTML = playIcon;
        button.title = "Start Timer";
        button.style.backgroundColor = "#1f75cb";
        button.style.borderColor = "#1f75cb";
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
      if (
        issueDetails &&
        !document.getElementById("gitlab-timer-start-button")
      ) {
        // Try to find the title element and inject button next to it
        const titleElement = document.querySelector(
          'h1[data-testid="work-item-title"]',
        );
        console.log("Title element for button injection:", titleElement);

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
          console.log("Start Timer button injected.");
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
});
