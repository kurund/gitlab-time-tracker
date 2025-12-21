# GitLab Time Tracker Chrome Extension

A Chrome extension that helps you track time spent on GitLab issues with automatic time logging.

## Features

### Timer on GitLab Issues

- **Play/Stop Button:** A timer button appears next to the issue title on GitLab issue pages
- **Visual Indicators:** Play icon (blue) to start, Stop icon (red) when running
- **Auto-Switch:** Starting a timer on a new issue automatically stops the previous timer and logs the time
- **State Persistence:** Timer state is preserved across page refreshes

### Live Timer Display

- **Badge Timer:** The extension icon shows a live, ticking timer (MM:SS format)
- **Popup Timer:** Large timer display in the popup showing elapsed time

### Task Management

- **Combined Task List:** Single list showing all tracked issues with favorites pinned at the top
- **Quick Search:** Filter tasks by title or issue ID
- **Favorites:** Star/unstar tasks to keep them easily accessible
- **Delete:** Remove tasks from the list

### Time Logging

- **Automatic Logging:** When you stop a timer, time is automatically posted to GitLab via the API
- **Manual Time Entry:** Click the + button on any task to manually log time (e.g., "1h 30m", "45m")
- **Inline Messages:** Success/error messages appear next to the timer button on the issue page

### Settings

- **Embedded Settings:** Configure GitLab URL and API token directly in the popup

## Installation

1. **Clone or download this repository:**

   ```bash
   git clone https://github.com/your-username/gitlab-time-tracker.git
   ```

2. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions`

3. **Enable Developer Mode:**
   - Toggle "Developer mode" in the top right corner

4. **Load the Extension:**
   - Click "Load unpacked"
   - Select the `gitlab-time-tracker` directory

5. **Configure Settings:**
   - Click the extension icon
   - Click the Settings button (gear icon)
   - Enter your GitLab URL (e.g., `https://gitlab.com`)
   - Enter your Personal Access Token
   - Click "Save Settings"

### Creating a GitLab Personal Access Token

1. Go to your GitLab instance
2. Navigate to **Settings → Access Tokens**
3. Create a new token with the `api` scope
4. Copy the token and paste it in the extension settings

## Usage

### Starting a Timer

1. Navigate to any GitLab issue page
2. Click the blue play button next to the issue title
3. The timer starts and appears in the extension badge

### Stopping a Timer

You can stop a timer in two ways:

- Click the red stop button on the GitLab issue page
- Click the extension icon and use the "Stop Timer" button in the popup

When stopped, the time is automatically logged to the GitLab issue.

### Manual Time Entry

1. Click the extension icon to open the popup
2. Find the task in the list
3. Click the + button
4. Enter the time (e.g., "2h", "30m", "1h 30m")
5. Click "Log" to submit

### Managing Tasks

- **Star a task:** Click the star icon to add to favorites (appears at top of list)
- **Search:** Type in the search box to filter tasks
- **Delete:** Click the X button to remove a task from the list
- **Open in GitLab:** Click the task title to open the issue in a new tab

## File Structure

```
gitlab-time-tracker/
├── manifest.json      # Extension configuration
├── background.js      # Service worker (timer logic, API calls)
├── content.js         # Injects timer button on GitLab pages
├── popup.html         # Popup UI structure and styles
├── popup.js           # Popup functionality
└── images/            # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- **storage:** Save settings and task history
- **tabs:** Communicate timer state changes to GitLab tabs
- **host_permissions:** Access GitLab API to log time

## License

AGPL-3.0 license
