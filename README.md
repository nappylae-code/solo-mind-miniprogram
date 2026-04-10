# SoloMind 🌿

> 写给独居者的情绪日记本——记录每一天的心情，看见真实的自己。

A WeChat Mini Program for daily mood tracking and emotional self-care,
designed specifically for people living alone.

---

## 📱 Pages & Status

| Page | Path | Status | Description |
|------|------|--------|-------------|
| 登录页 | `pages/index/index` | ✅ Live | 用户初始化，头像与昵称设置 |
| 今天 | `pages/mood/mood` | ✅ Live | 每日情绪打卡、周历、连续打卡追踪 |
| 日记 | `pages/diary/diary` | 🔧 In Progress | 日记列表，按月分组，情绪筛选 |
| 日记详情 | `pages/diary/diary-detail` | 🔧 In Progress | 单篇日记查看与删除 |
| 日记编辑 | `pages/diary/diary-edit` | 🔧 In Progress | 富文本日记编辑，关联当日情绪 |
| 广场 | `pages/community/community` | 🔧 In Progress | 匿名情绪广场，轻社交 |
| 我的 | `pages/profile/profile` | 🔧 In Progress | 用户成长档案、成就、会员 |
| 情绪报告 | `pages/report/report` | 🔧 In Progress | 情绪趋势、年历、可分享周报 |

---

## ✅ Implemented Features

- 🔐 **微信登录** — 头像选择 + 昵称填写，生成安全 UUID 作为用户标识
- 😄 **每日情绪打卡** — 5 种情绪（😄 极好 / 🙂 开心 / 😌 平静 / 😢 难过 / 😠 生气），支持备注（最多 500 字）
- ☁️ **云端存储** — 情绪数据保存至微信云数据库（`moodEntries`）
- 📅 **周历视图** — 7 天情绪色块可视化
- 🔥 **连续打卡追踪** — Streak 计数器
- ✨ **每日语录** — 根据日期轮换的励志语录
- 🔒 **数据安全** — AES 加密 + 安全 UUID（`crypto-js`）

---

## 😄 Mood Types

| Key | Emoji | 标签 | Color |
|-----|-------|------|-------|
| GREAT | 😄 | 极好 | `#4CAF50` |
| HAPPY | 🙂 | 开心 | `#8BC34A` |
| CALM | 😌 | 平静 | `#2196F3` |
| SAD | 😢 | 难过 | `#F44336` |
| ANGRY | 😠 | 生气 | `#E91E63` |

---

## 🗺️ Navigation Structure

```
TabBar
├── 🏠 今天      (pages/mood/mood)        — 每日打卡主页
├── 📔 日记      (pages/diary/diary)      — 日记列表
├── 🌐 广场      (pages/community/community) — 匿名情绪广场
└── 👤 我的      (pages/profile/profile)  — 个人成长档案

Sub Pages
├── pages/diary/diary-detail   — 日记详情
├── pages/diary/diary-edit     — 日记编辑
└── pages/report/report        — 情绪报告
```

---

## 🗓️ Development Roadmap

### 🥇 第一阶段（进行中）
- [ ] 日记列表页（时间轴，按月分组，情绪筛选）
- [ ] 日记详情页（查看、删除）
- [ ] 日记编辑页（富文本，关联情绪）
- [ ] 情绪可视化升级（月历、年历 Year in Pixels）
- [ ] 个人主页（数据概览、成就系统）

### 🥈 第二阶段
- [ ] 会员订阅体系（¥18/月 或 ¥128/年）
- [ ] 匿名情绪广场（预设表情回应，不开放文字评论）

### 🥉 第三阶段（谨慎推进）
- [ ] AI 内容推荐（情绪 → 语录/音乐/文章匹配，非心理建议）
- [ ] 专业资源导流（第三方合作，不自营）

---

## ☁️ Cloud Configuration

| Item | Details |
|------|---------|
| Cloud Environment ID | `cloud1-3gh5mibgd5111425` |
| Database Collection | `moodEntries` |
| Data Permission | Creator read/write only |

### Database Fields (`moodEntries`)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | 用户唯一标识（AES 加密 UUID） |
| `date` | String | 日期（`YYYY-MM-DD`） |
| `moodKey` | String | 情绪类型（如 `GREAT`、`CALM`） |
| `note` | String | 备注（最多 500 字） |
| `timestamp` | Number | Unix 时间戳 |

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| TypeScript | 应用逻辑 |
| WXML | UI 结构 |
| WXSS | 样式 |
| `crypto-js ^4.2.0` | AES 加密 & UUID 生成 |
| `wx.cloud` | 云数据库与云存储 |
| `wx.storage` | 本地存储（userId、nickname、avatar） |

> 最低支持微信版本：**7.0.0+**

---

## 🚀 Quick Start

```bash
# 1. 克隆仓库
git clone https://github.com/nappylae-code/solo-mind-miniprogram.git

# 2. 用微信开发者工具打开项目目录

# 3. 在 project.config.json 中填入真实 AppID

# 4. 工具 → 构建 npm

# 5. 点击编译运行
```

> ⚠️ **必须使用真实 AppID** — 测试号不支持云开发功能。

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| npm 模块找不到 | 执行 工具 → 构建 npm |
| 云开发初始化失败 | 确认使用真实 AppID 且已开启云开发 |
| 情绪数据保存失败 | 检查网络，确认云数据库中存在 `moodEntries` 集合 |
| `getUserProfile` 失败 | 在微信模拟器或真机上运行 |
| 页面白屏 | 确认 `app.json` 中页面路径与实际文件一致 |

---

## 📁 Project Structure

```
solo-mind-miniprogram/
├── pages/
│   ├── index/          # 登录初始化页
│   ├── mood/           # 今天（Tab 1）
│   ├── diary/          # 日记（Tab 2）
│   │   ├── diary.*             # 日记列表
│   │   ├── diary-detail.*      # 日记详情
│   │   └── diary-edit.*        # 日记编辑
│   ├── community/      # 广场（Tab 3）
│   ├── profile/        # 我的（Tab 4）
│   └── report/         # 情绪报告（子页面）
├── components/
│   └── MoodCard/       # 情绪卡片组件
├── constants/          # 常量定义（情绪类型等）
├── utils/              # 工具函数（加密、日期等）
├── images/             # TabBar 图标
├── assets/             # 静态资源
├── app.ts              # 全局逻辑
├── app.json            # 全局配置
└── app.wxss            # 全局样式
```

---

## 📄 License

Private — All rights reserved.