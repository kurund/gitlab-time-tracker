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
        };
        console.log("Issue details found:", issueDetails);
        return issueDetails;
      }
      console.log("Could not find all issue details.");
      return null;
    }

    function updateButtonState(button, isRunning, issueDetails) {
      if (isRunning) {
        button.textContent = "Stop Timer";
        button.className = "btn gl-button btn-danger btn-md gl-ml-3";
        button.onclick = () => {
          chrome.runtime.sendMessage({ action: "stopTimer" }, () => {
            updateButtonState(button, false, issueDetails);
          });
        };
      } else {
        button.textContent = "Start Timer";
        button.className = "btn gl-button btn-default btn-md gl-ml-3";
        button.onclick = () => {
          chrome.runtime.sendMessage(
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
            "vertical-align: middle; margin-left: 12px; cursor: pointer;";

          // Check current timer state and set button accordingly
          chrome.runtime.sendMessage(
            { action: "getTimerState" },
            (response) => {
              const isRunning =
                response &&
                response.isRunning &&
                response.issue &&
                response.issue.id === issueDetails.id;
              updateButtonState(button, isRunning, issueDetails);
            },
          );

          // Insert button after the title element
          titleElement.parentNode.insertBefore(
            button,
            titleElement.nextSibling,
          );
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

    // Also run on load
    injectStartButton();
  }
});
