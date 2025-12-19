# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/Edge browser extension (摸鱼时间控制器 - Distraction Website Controller) built with Vue 3 and Vite. It monitors time spent on "distraction websites" and automatically redirects to a productive site when the countdown reaches zero.

## Build Commands

```bash
# Install dependencies
npm install

# Build the extension for production
npm run build

# The output will be in the `dist/` directory, which can be loaded as an unpacked extension in Chrome/Edge
```

## Development Workflow

1. Modify source code
2. Run `npm run build`
3. Go to browser extension page (chrome://extensions/ or edge://extensions/)
4. Click "Reload" button for the extension
5. Refresh any open distraction website tabs to apply changes

## Architecture

### Three-Part Extension System

The extension follows Chrome Extension Manifest V3 architecture with three isolated execution contexts:

1. **Background Service Worker** (`src/background.js`)
   - Runs persistently in the background
   - Manages global state in `trackingData` object (maps siteId → {tabId, url, interval})
   - Listens to tab activation/updates/removal events
   - Runs 1-second intervals for each tracked site to decrement timers
   - Performs redirect when countdown reaches zero
   - Communicates with content scripts via `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`

2. **Content Script** (`src/content.js`)
   - Injected into all web pages (`<all_urls>`)
   - Creates and manages the countdown overlay (fixed bottom-right position)
   - Checks current URL against stored website list on page load and URL changes
   - Sends `START_TRACKING` message to background when matched
   - Listens for `UPDATE_COUNTDOWN` messages to refresh display
   - URL matching uses `String.includes()` method (e.g., "bilibili.com" matches "https://www.bilibili.com/video/xxx")

3. **Options Page** (`src/OptionsApp.vue`)
   - Standalone Vue 3 SFC loaded via `options.html`
   - Manages website list and global settings
   - Data structure per site: `{id, name, url, defaultTime, remainingTime, totalTime, delayAmount, enabled}`
   - Polls `chrome.storage.local` every 1 second to display live countdown updates
   - Sends `UPDATE_TIMER` messages to background when user adds delay or resets

### Data Flow

```
User visits distraction site
  → content.js detects URL match
  → Sends START_TRACKING to background.js
  → background.js starts 1s interval timer
  → Every second: decrements storage, sends UPDATE_COUNTDOWN to content.js
  → content.js updates overlay display
  → When timer hits 0: background.js redirects tab
```

### Storage Schema

All data stored in `chrome.storage.local`:

```javascript
{
  redirectUrl: "https://www.google.com",  // Where to redirect when time's up
  websites: [
    {
      id: 1234567890,           // Timestamp-based unique ID
      name: "哔哩哔哩",          // Display name
      url: "bilibili.com",      // URL pattern for matching
      defaultTime: 600,         // Default countdown in seconds
      remainingTime: 450,       // Current countdown remaining
      totalTime: 3600,          // Cumulative time spent
      delayAmount: 300,         // Selected delay duration
      enabled: true             // Whether tracking is active
    }
  ]
}
```

## Key Files

- `public/manifest.json` - Extension manifest (Manifest V3)
- `src/background.js` - Background service worker
- `src/content.js` - Content script injected into all pages
- `src/OptionsApp.vue` - Settings page Vue component
- `public/content.css` - Styles for countdown overlay
- `vite.config.js` - Custom Vite config for multi-entry extension build
- `generate-icons.html` - Utility to generate icon16.png, icon48.png, icon128.png

## Build Configuration Notes

The Vite config (`vite.config.js`) is customized for Chrome extensions:
- Multiple entry points: options.html, background.js, content.js
- `background.js` and `content.js` output at dist root (not in assets/)
- Other assets go to `dist/assets/`
- This structure matches manifest.json expectations

## Missing Files Requirement

The extension requires three icon files in `public/`:
- `icon16.png` (16×16 px)
- `icon48.png` (48×48 px)
- `icon128.png` (128×128 px)

Use `generate-icons.html` in a browser to download these icons, then place them in `public/` before building.

## Browser Installation

After building:
1. Chrome: Visit `chrome://extensions/`, enable Developer mode, click "Load unpacked", select `dist/` folder
2. Edge: Visit `edge://extensions/`, enable Developer mode, click "Load unpacked", select `dist/` folder

## Common Issues

- **Countdown not showing**: Verify the visited URL contains the configured website URL pattern (uses `includes()`)
- **Settings not applying**: Refresh the distraction website page after changing settings
- **Build fails**: Ensure all three icon files exist in `public/`
