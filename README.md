
---

## ✅ 已实现功能

- 🔐 微信身份授权登录（`getUserProfile`）
- 😊 每日情绪记录（5 种情绪 + 备注，最多 500 字）
- ☁️ 情绪数据存储至微信云开发数据库
- 📅 每周日历视图 & 连续打卡天数统计
- 🔒 AES 加密 & 安全 UUID 生成

---

## ☁️ 云开发配置

| 项目 | 详情 |
|---|---|
| **云环境 ID** | `cloud1-3gh5mibgd5111425` |
| **数据库集合** | `moodEntries` |
| **数据权限** | 仅创建者可读写 |

### 云数据库字段 (`moodEntries`)

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | String | 用户唯一标识 |
| `date` | String | 日期（YYYY-MM-DD）|
| `moodKey` | String | 情绪类型 |
| `note` | String | 备注（最多 500 字）|
| `timestamp` | Number | 时间戳 |

---

## 🚀 快速开始

1. 用微信开发者工具导入项目，填入真实 **AppID**
2. 菜单：**工具 → 构建 npm**
3. 点击「编译」运行

> ⚠️ 需使用**真实 AppID**（测试号不支持云开发）

---

## 🔧 常见问题

| 问题 | 解决方案 |
|---|---|
| npm 模块找不到 | 执行「构建 npm」 |
| 云开发初始化失败 | 确认使用真实 AppID 且已开通云开发 |
| 情绪数据保存失败 | 检查网络 & 确认 `moodEntries` 集合已创建 |
| `getUserProfile` 失败 | 在微信模拟器或真机运行 |

---

## 🏗️ 技术栈

`TypeScript` · `WXML` · `WXSS` · `crypto-js` · `wx.cloud` · `wx.storage`

最低支持微信版本：**7.0.0+**

---

## 📄 License

Private