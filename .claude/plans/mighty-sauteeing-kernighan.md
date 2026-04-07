# Plan: Localize All English UI Text to Chinese

## Context
The SoloMind miniprogram currently has a mix of English and Chinese text. The user wants all captions, button labels, error messages, and UI text to be in Chinese. Currently, only some parts (like mood labels, some error messages in mood page) are in Chinese, while key navigation and login/register flows are in English.

## Files to Modify and Changes

### 1. `pages/login/login.wxml`
- Title: "Mood Check-In" → "心情追踪"
- Subtitle: "Sign in to track your mood" → "登录以追踪您的心情"
- Placeholder: "Email" → "邮箱"
- Placeholder: "Password" → "密码"
- Button text: "Login" → "登录"
- Register link: "Don't have an account? Register" → "还没有账号？立即注册"

### 2. `pages/login/login.ts`
- `confirmText: 'OK'` (line 81) → `confirmText: '确定'`

### 3. `pages/register/register.wxml`
- Title: "Create Account" → "创建账号"
- Subtitle: "Register to get started" → "注册开始使用"
- Placeholder: "Email" → "邮箱"
- Placeholder: "Password" → "密码"
- Placeholder: "Confirm Password" → "确认密码"
- Button loading text: "Creating..." → "创建中..."
- Button text: "Register" → "注册"
- Back link: "Already have an account? Login" → "已有账号？登录"

### 4. `pages/register/register.ts`
- Error title: `'Error'` (multiple instances) → `'错误'`
- `'Please fill in all fields.'` → `'请填写所有字段'`
- `'Please enter a valid email address.'` → `'请输入有效的邮箱地址'`
- `'Password must be at least 6 characters.'` → `'密码至少需要6个字符'`
- `'Passwords do not match.'` → `'两次输入的密码不一致'`
- Success title: `'Success'` → `'成功'`
- Success message: `'Account created! You can now login.'` → `'账号已创建！现在可以登录。'`
- All `confirmText: 'OK'` → `confirmText: '确定'`
- Error message: `'An error occurred during registration. Please try again.'` → `'注册过程中发生错误，请重试。'`

### 5. `pages/mood/mood.wxml`
- Header logout button: "Logout" → "退出登录"
- Placeholder: "写几句..." (already Chinese, keep as is)

### 6. `pages/mood/mood.ts`
- Day labels: `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']` → `['周一', '周二', '周三', '周四', '周五', '周六', '周日']`
- Month labels: `['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']` → `['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']`
- All `confirmText: 'OK'` → `confirmText: '确定'` (lines 215, 238, 246)

### 7. `pages/index/index.wxml`
- Title: "Mood Check-In" → "心情追踪"
- Subtitle: "Sign in to track your mood" → "登录以追踪您的心情"
- Placeholders: "Email", "Password" → "邮箱", "密码"
- Button: "Login" → "登录"
- Register link: "Don't have an account? Register" → "还没有账号？立即注册"

### 8. `app.json`
- `navigationBarTitleText`: "SoloMind" → "SoloMind" (keep brand name as-is, or optionally: "心情追踪")
- Note: The mood pages already use dynamic titles from their .json files

### 9. `pages/login/login.json`
- `navigationBarTitleText`: "Login" → "登录"

### 10. `pages/register/register.json`
- `navigationBarTitleText`: "Register" → "注册"

### 11. `pages/mood/mood.json`
- `navigationBarTitleText`: "Mood Check-In" → "今日心情" (already in wxml header, but consistent)

## Verification
After making changes:
1. Build the miniprogram in WeChat DevTools
2. Navigate through all pages (login, register, mood) and verify all text displays in Chinese
3. Test error messages by triggering validation errors
4. Test modal dialogs (success, logout confirmation, etc.)
