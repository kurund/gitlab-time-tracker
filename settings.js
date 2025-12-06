// settings.js

const form = document.getElementById("settings-form");
const gitlabUrlInput = document.getElementById("gitlab-url");
const apiTokenInput = document.getElementById("api-token");
const statusDiv = document.getElementById("status");

// Load saved settings
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["gitlabUrl", "apiToken"], (result) => {
    if (result.gitlabUrl) {
      gitlabUrlInput.value = result.gitlabUrl;
    }
    if (result.apiToken) {
      apiTokenInput.value = result.apiToken;
    }
  });
});

// Save settings
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const gitlabUrl = gitlabUrlInput.value;
  const apiToken = apiTokenInput.value;

  chrome.storage.sync.set({ gitlabUrl, apiToken }, () => {
    statusDiv.textContent = "Settings saved!";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });
});
