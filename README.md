# GitLab Time Tracker Chrome Extension

A Chrome extension that helps you track time spent on GitLab issues with automatic time logging.

## Features

### Timer on GitLab Issues

- **Play/Stop Button:** A timer button appears next to the issue title on GitLab issue pages
- **Visual Indicators:** Play icon (orange) to start, Stop icon (purple) when running
- **Cancel Option:** Cancel a timer without logging time
- **Auto-Switch:** Starting a timer on a new issue automatically stops and logs the previous one
- **State Persistence:** Timer state is preserved across page refreshes

### Live Timer Display

- **Badge Timer:** The extension icon shows elapsed time (1s → 10m → 1h10)
- **Popup Timer:** Large timer display showing elapsed time (e.g., "5m 30s", "1h 20m")

### Task Management

- **Combined Task List:** All tracked issues with favorites pinned at the top
- **Time-Sorted:** Both favorites and regular tasks sorted by most recent
- **Quick Search:** Filter tasks by title or issue ID
- **Favorites:** Star/unstar tasks to keep them easily accessible
- **Delete:** Remove tasks from the list

### Time Logging

- **Automatic Logging:** Time is posted to GitLab when you stop the timer
- **Minimum 1 Minute:** Times under 1 minute are not logged
- **Rounded to Minutes:** Seconds are ignored (e.g., 8m 45s logs as "8m")
- **Manual Time Entry:** Click + to manually log time (e.g., "1h 30m", "45m")
- **Inline Messages:** Success/error messages appear next to the timer button

### Security

- **Optional Permissions:** Extension only requests access to your GitLab URL when you grant it
- **Local Storage:** Credentials stored locally, not synced across devices
- **Minimal Permissions:** Only requests necessary permissions

### Settings

- **Embedded Settings:** Configure GitLab URL and API token in the popup
- **Permission Request:** Explicitly grant access to your GitLab instance

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
   - Click Settings (gear icon)
   - Enter your GitLab URL (e.g., `https://gitlab.com`)
   - Enter your Personal Access Token
   - Click "Request Permission" to grant access
   - Click "Save"

### Creating a GitLab Personal Access Token

1. Go to your GitLab instance
2. Navigate to **Settings → Access Tokens**
3. Create a new token with the `api` scope
4. Copy the token and paste it in the extension settings

## Usage

### Starting a Timer

1. Navigate to any GitLab issue page
2. Click the orange play button next to the issue title
3. The timer starts and appears in the extension badge

### Stopping a Timer

- Click the purple stop button on the issue page, or
- Click "Stop" in the extension popup

Time is automatically logged to GitLab (if >= 1 minute).

### Canceling a Timer

- Click "Cancel" next to the stop button on the issue page, or
- Click "Cancel" in the extension popup

Timer stops without logging time.

### Manual Time Entry

1. Open the extension popup
2. Find the task in the list
3. Click the + button
4. Enter time (e.g., "2h", "30m", "1h 30m")
5. Click "Log"

### Managing Tasks

- **Star:** Click star icon to favorite (appears at top)
- **Search:** Type to filter tasks
- **Delete:** Click × to remove from list
- **Open:** Click task title to open in GitLab

## File Structure

```
gitlab-time-tracker/
├── manifest.json      # Extension configuration
├── background.js      # Service worker (timer logic, API calls)
├── content.js         # Injects timer button on GitLab pages
├── popup.html         # Popup UI structure and styles
├── popup.js           # Popup functionality
└── images/            # Extension icons
    ├── icon.svg
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- **storage:** Save settings and task history
- **scripting:** Inject content script on GitLab pages
- **tabs:** Detect navigation to GitLab pages
- **optional host permissions:** Access GitLab API (granted by user)

## License

AGPL-3.0 license
