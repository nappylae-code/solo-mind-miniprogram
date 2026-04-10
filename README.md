# SoloMind 🧠

> A WeChat Mini Program for daily mood tracking and emotional self-care.

---

## 📱 Pages

| Page | Status | Description |
|------|--------|-------------|
| **Home / Mood** (`pages/mood`) | ✅ Live | Daily mood check-in, weekly calendar, streak tracking |
| **Diary** (`pages/diary`) | 🚧 In Progress | Personal diary entries |
| **Community** (`pages/community`) | 🚧 In Progress | Community posts & social feed |
| **Profile** (`pages/profile`) | 🚧 In Progress | User profile & settings |

---

## ✅ Implemented Features

- 🔐 **WeChat Login** — Identity authorization via `getUserProfile`
- 😊 **Daily Mood Check-in** — Choose from 5 moods (😃 太棒了 / 😊 开心 / 😌 平静 / 😢 难过 / 😡 生气) with optional note (max 500 characters)
- ☁️ **Cloud Storage** — Mood data saved to WeChat Cloud Database (`moodEntries`)
- 📅 **Weekly Calendar View** — Visual 7-day mood tracker
- 🔥 **Streak Counter** — Tracks consecutive check-in days
- 💬 **Daily Quote** — Rotating motivational quote based on the date
- 🔒 **AES Encryption & Secure UUID** — User data security via `crypto-js`

---

## 😊 Mood Types

| Key | Emoji | Label | Color |
|-----|-------|-------|-------|
| `GREAT` | 😃 | 太棒了 | `#4CAF50` |
| `HAPPY` | 😊 | 开心 | `#8BC34A` |
| `CALM` | 😌 | 平静 | `#2196F3` |
| `SAD` | 😢 | 难过 | `#F44336` |
| `ANGRY` | 😡 | 生气 | `#E91E63` |

---

## ☁️ Cloud Configuration

| Item | Details |
|------|---------|
| **Cloud Environment ID** | `cloud1-3gh5mibgd5111425` |
| **Database Collection** | `moodEntries` |
| **Data Permission** | Creator read/write only |

### Database Fields (`moodEntries`)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Unique user identifier |
| `date` | String | Date in `YYYY-MM-DD` format |
| `moodKey` | String | Mood type key (e.g. `GREAT`, `CALM`) |
| `note` | String | Optional note (max 500 characters) |
| `timestamp` | Number | Unix timestamp |

---

## 🏗️ Tech Stack

| Technology | Usage |
|------------|-------|
| `TypeScript` | App logic |
| `WXML` | UI markup |
| `WXSS` | Styling |
| `crypto-js ^4.2.0` | AES encryption & UUID |
| `wx.cloud` | Cloud database & storage |
| `wx.storage` | Local storage (userId, nickname, avatar) |

> Minimum supported WeChat version: **7.0.0+**

---

## 🚀 Quick Start

1. Clone the repo and open in **Weixin DevTools**
2. Fill in your real **AppID** in `project.config.json`
3. Go to **Tools → Build npm**
4. Click **Compile** to run

> ⚠️ A real AppID is required — test accounts do not support Cloud Development.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| npm module not found | Run **Tools → Build npm** |
| Cloud init fails | Confirm real AppID and Cloud Development is enabled |
| Mood data not saving | Check network & confirm `moodEntries` collection exists in cloud DB |
| `getUserProfile` fails | Run on WeChat simulator or a real device |

---

## 📄 License

Private