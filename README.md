# SoloMind WeChat Mini Program

This is the WeChat Mini Program version of SoloMind, a mood tracking app.

## Project Structure

```
solo-mind-miniprogram_claude/
├── app.ts              # App entry point
├── app.json            # Global configuration (pages list)
├── app.wxss            # Global styles
├── package.json        # NPM dependencies (crypto-js)
├── tsconfig.json       # TypeScript configuration
├── project.config.json # WeChat DevTools project config
├── sitemap.json        # Sitemap for indexing
├── assets/             # App icons and images
├── components/
│   └── MoodCard/       # Reusable mood card component
├── pages/
│   ├── index/          # Auth redirect page
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   └── mood/           # Main mood tracking page
├── utils/
│   └── encryption.ts   # AES encryption utilities
└── constants/
    └── mood.ts         # Mood definitions
```

## Prerequisites

1. **WeChat DevTools** (微信开发者工具) installed
2. WeChat account (for logging into DevTools)

## Setup Steps

### 1. Open Project
- Launch WeChat DevTools
- Click "Import Project"
- Select this directory
- Choose Test AppID (or your own) and TypeScript template (already configured)

### 2. Install Dependencies
This project uses `crypto-js` for encryption.

In WeChat DevTools:
- Menu: **工具** (Tools) → **构建npm** (Build npm)
- Wait for the build to complete

This will install `crypto-js` into the `miniprogram_npm` folder.

### 3. Compile and Run
- Click **"编译"** (Compile) button in DevTools
- The simulator should show the app
- Start with the login page (create an account first)

## Features

- ✅ User registration and login with email/password
- ✅ Mood tracking with 5 categories (Great, Happy, Calm, Sad, Angry)
- ✅ Daily notes with mood entries
- ✅ Weekly calendar view with mood indicators
- ✅ Streak counter for consecutive days
- ✅ AES encryption for stored data
- ✅ Secure credential storage

## Data Storage

All data is stored locally in WeChat's storage (`wx.storage`):
- `isLoggedIn` - login status
- `userEmail` - current user email
- `creds_<email>` - encrypted credentials (SHA256 hash)
- `moodData` - encrypted mood entries (AES)

## Development Notes

- Built with **TypeScript** and **Sass** (WXSS)
- Uses native WeChat Mini Program APIs (no framework)
- Responsive units: **rpx** (responsive pixels)
- Minimum platform: WeChat 7.0.0+

## Testing

1. **Register** a new account
2. **Login** with credentials
3. **Select** a mood, optionally add a note
4. **Save** and see it appear in the weekly calendar
5. **Logout** and login again to verify persistence
6. **Streak** should increment with consecutive days

## Converting to Release

1. In DevTools, click **"预览"** (Preview) to generate a QR code
2. Scan with WeChat on a real device to test
3. For release: submit to WeChat for review via 微信开放平台

## Troubleshooting

- **npm modules not found**: Ensure you ran "构建npm" and that `miniprogram_npm` folder exists
- **Build errors**: Check that TypeScript compiles without errors
- **Storage errors**: Clear storage from DevTools: Tools → Clear storage

## License

Private
