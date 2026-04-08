# SoloMind WeChat Mini Program

This is the WeChat Mini Program version of SoloMind, a mood tracking app that helps users record and track their daily emotional states.

## Project Structure

```
solo-mind-miniprogram_claude/
├── app.json              # Global configuration (pages list, window settings)
├── app.wxss              # Global styles
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript configuration
├── project.config.json   # WeChat DevTools project config
├── sitemap.json          # Sitemap for indexing
├── assets/               # App icons and images
├── components/
│   └── MoodCard/         # Reusable mood card component
├── pages/
│   ├── index/            # WeChat identity consent/auth page
│   └── mood/             # Main mood tracking page
├── utils/
│   └── encryption.ts     # Secure storage utilities
└── constants/
    └── mood.ts           # Mood definitions (5 mood categories)
```

## Prerequisites

1. **WeChat DevTools** (微信开发者工具) installed
2. WeChat account (for logging into DevTools and using WeChat identity)

## Setup Steps

### 1. Open Project
- Launch WeChat DevTools
- Click "Import Project"
- Select this directory
- Choose Test AppID (or your own) and TypeScript template (already configured)

### 2. Install Dependencies
This project uses `crypto-js` for encryption utilities.

In WeChat DevTools:
- Menu: **工具** (Tools) → **构建npm** (Build npm)
- Wait for the build to complete

This will install `crypto-js` into the `miniprogram_npm` folder.

### 3. Compile and Run
- Click **"编译"** (Compile) button in DevTools
- The simulator should show the app
- Start by authorizing with WeChat identity on the index page

## Features

- ✅ WeChat identity authentication (getUserProfile)
- ✅ Mood tracking with 5 categories (Great, Happy, Calm, Sad, Angry)
- ✅ Daily notes with mood entries
- ✅ Weekly calendar view with mood indicators
- ✅ Streak counter for consecutive days
- ✅ Secure local data storage
- ✅ Chinese UI localization
- ✅ Auto-save today's entry on return

## Data Storage

All data is stored locally in WeChat's storage (`wx.storage`):
- `userId` - Unique user identifier (UUID)
- `userNickname` - WeChat nickname
- `userAvatarUrl` - WeChat avatar URL
- `isLoggedIn` - Login status flag
- `moodData` - Mood entries (encrypted storage)

## Authentication Flow

1. User opens the app → redirected to `pages/index/index` (consent page)
2. User clicks "使用微信登录" (Use WeChat to login)
3. WeChat `getUserProfile` dialog appears
4. Upon approval: user info is saved to storage and user is redirected to mood page
5. On subsequent launches: user is automatically redirected to mood page if already logged in

## Development Notes

- Built with **TypeScript** and **Sass** (WXSS)
- Uses native WeChat Mini Program APIs (no external framework)
- Responsive units: **rpx** (responsive pixels)
- Minimum WeChat version: 7.0.0+
- All UI text is localized in Chinese

## Testing

1. Open the app → should see WeChat identity consent page
2. Click "使用微信登录" to authorize
3. You'll be taken to the mood tracking page
4. Select a mood, optionally add a note
5. Click "保存今天的心情" to save
6. See the entry appear in the weekly calendar
7. Streak counter increments with consecutive days
8. Close and reopen to test persistence

## Converting to Release

1. In DevTools, click **"预览"** (Preview) to generate a QR code
2. Scan with WeChat on a real device to test
3. For release: submit to WeChat for review via 微信开放平台

## Troubleshooting

- **npm modules not found**: Ensure you ran "构建npm" and that `miniprogram_npm` folder exists
- **Build errors**: Check that TypeScript compiles without errors in the DevTools console
- **Storage errors**: Clear storage from DevTools: Tools → Clear storage
- **getUserProfile fails**: Ensure the app is running in a WeChat environment (simulator or real device)

## License

Private
