# GitLab Time Tracker Chrome Extension

This is a Chrome extension that helps you track time spent on GitLab issues.

## Features

- **Start Timer from Issue:** A "Start Timer" button is added to GitLab issue pages.
- **Live Timer in Icon:** The extension icon shows a live, ticking timer.
- **Popup UI:** Click the extension icon to see the running timer, stop it, and view recent/favorite tasks.
- **GitLab Integration:** When you stop a timer, the time is automatically added to the corresponding GitLab issue.
- **Settings:** Configure your GitLab instance URL and Personal Access Token.

## How to Install

1. **Clone this repository:**

   ```bash
   git clone https://github.com/your-username/gitlab-time-tracker.git
   ```

2. **Open Chrome Extensions:** Open the Chrome browser and navigate to `chrome://extensions`.
3. **Enable Developer Mode:** Turn on the "Developer mode" toggle in the top right corner.
4. **Load Unpacked:** Click the "Load unpacked" button and select the directory where you cloned the repository.
5. **Configure Settings:**
   - Click on the extension's "Details" button and then "Extension options".
   - Enter your GitLab instance URL (e.g., `https://gitlab.com`) and your Personal Access Token. You can create a token from your GitLab profile's "Access Tokens" section.
   - Click "Save".

## How to Use

1. **Navigate to a GitLab Issue:** Go to any issue page in your GitLab instance.
2. **Start the Timer:** You will see a "Start Timer" button next to the issue title. Click it to start the timer.
3. **View the Timer:** The extension icon will update with the elapsed time. You can also click the icon to see the timer in the popup.
4. **Stop the Timer:** Click the "Stop Timer" button in the popup. The time will be automatically logged to the GitLab issue.
