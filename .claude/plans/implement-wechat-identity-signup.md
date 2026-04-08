# Implementation Plan: WeChat Identity Signup Flow

## Context
Replace email/password authentication with WeChat identity (local profile) since there is no backend server. The login and register screens will be removed. The flow will be:
1. On app launch, ask user to consent to using WeChat identity.
2. If yes, get user profile, store a local userId, navigate to mood screen.
3. If no, exit/miniprogram quit.
4. Mood screen will show stored mood data for that userId.
5. Remove logout button (rely on WeChat's native quit).

## Detailed Changes

### 1. Update `app.json`
- Remove `pages/login/login` and `pages/register/register` from the `pages` array.
- Keep: `pages/index/index`, `pages/mood/mood`.
- This prevents navigation to removed pages.

### 2. Convert `pages/index/index` to WeChat Consent/Signup Page
**Current:** Simple redirect page.
**New:** Display a consent screen with:
- Title: "欢迎使用 SoloMind"
- Subtitle: "使用微信身份来记录您的心情"
- Two buttons:
  - "使用微信身份注册" (primary)
  - "退出" (secondary)

**Logic (index.ts):**
- `onShow()`: Check if `userId` exists in storage.
  - If yes, redirect to `/pages/mood/mood` (auto-login).
  - If no, stay on page to show consent UI.
- `onUseWeChat()`: Call `wx.getUserProfile()` with description '用于完善会员资料'.
  - On success: generate a stable userId (UUID) and store in `wx.setStorageSync('userId', uuid)`. Also store nickname and avatarUrl for display. Optionally set `isLoggedIn` flag to true. Redirect to mood page.
  - On fail/cancel: show error toast but stay on page.
- `onExitMiniProgram()`: Call `wx.exitMiniProgram()`.

**WXML:** Add buttons and bind handlers.

### 3. Update `pages/mood/mood.ts`
- Change `loadData()`:
  - Replace email check: `const email = wx.getStorageSync(USER_EMAIL_KEY)` → `const userId = wx.getStorageSync('userId')`.
  - If no userId, redirect to `/pages/index/index`.
  - Keep the rest (load mood data) as is since mood data is stored globally under `moodData` key.
- Remove `handleLogout()` function entirely and its references.
- Remove any UI logout button (top right). Check `mood.wxml` for a logout button and delete it.
- Optionally display user avatar/nickname in header (if you want to "show input info related to identity"). Store user info from index page (nickname, avatarUrl) and show them in mood page UI.

### 4. Update `app.ts` (optional)
- `globalData`: Replace `userEmail` with `userId: null`. `isLoggedIn` remains.
- On app launch, we could pre-load userId if needed, but not necessary.

### 5. Clean Up Unused Files
- Delete `pages/login/` and `pages/register/` directories.
- Alternatively, leave them in project but remove from `app.json` to prevent navigation. Deleting is cleaner.

### 6. Remove Email/Password Specific Storage References
- In code, replace `USER_EMAIL_KEY` with `USER_ID_KEY` where appropriate (login, register). Since those pages are gone, only `mood.ts` may still reference `USER_EMAIL_KEY`. Need to update.
- In `login.ts` and `register.ts` we can ignore since files are deleted.

## Storage Schema after Change
- `userId`: string (UUID) — identifies the current user
- `userNickname`: string (optional, for display)
- `userAvatarUrl`: string (optional)
- `isLoggedIn`: boolean (optional, can be derived from userId existence)
- `moodData`: JSON string of mood entries (unchanged)

## Verification / Test Steps
1. Fresh miniprogram start:
   - Index page shows consent screen with two buttons.
   - Click "退出" → miniprogram exits.
   - Click "使用微信身份注册" → `wx.getUserProfile` dialog appears.
   - On accept, nickname/avatar saved, `userId` stored, redirect to mood page.
2. Mood page loads:
   - Existing mood data (if any) displays correctly.
   - No logout button present.
   - Header (if added) shows user nickname/avatar.
3. Close and reopen miniprogram:
   - Index page should auto-redirect to mood page (userId exists).
4. Clear storage → fresh consent flow again.

---

## Files to Modify

### Critical
- `app.json`
- `pages/index/index.ts`
- `pages/index/index.wxml`
- `pages/mood/mood.ts`
- `pages/mood/mood.wxml` (remove logout button)
- `app.ts` (optional)

### Removals
- `pages/login/` (folder)
- `pages/register/` (folder)

---

## Notes & Considerations
- `wx.getUserProfile` must be called from a user click handler. This is satisfied by the button on index page.
- `wx.exitMiniProgram()` works on user gesture (button click) — also satisfied.
- WeChat does not provide a stable, unique openId/unionId without a backend. We'll generate a UUID locally. This means the user's mood data is tied to the device. If they clear storage, they'll be a new user. That's acceptable for local-only.
- The mood data key (`moodData`) remains global; no per-user namespacing needed because single user per device after signup.
- If we want to protect data from being accessed by another WeChat user on same device, we could add simple encryption with a key derived from userId, but out of scope.
