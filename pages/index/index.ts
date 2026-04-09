declare const wx: any;

// ============================================
// Generate a UUID v4 using synchronous random
// crypto.getRandomValues is supported in
// WeChat MiniProgram base library 2.17.3+
// ============================================
function generateUUID(): string {
  const array = new Uint8Array(16);

  // Use synchronous crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Safe fallback using Math.random()
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version to 4 (UUID v4)
  array[6] = (array[6] & 0x0f) | 0x40;
  // Set variant bits
  array[8] = (array[8] & 0x3f) | 0x80;

  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
}

Page({
  data: {
    avatarUrl: '',
    nickname: ''
  },

  onShow() {
    try {
      const userId = wx.getStorageSync('userId');
      if (userId) {
        wx.switchTab({ url: '/pages/mood/mood' });
        return;
      }
    } catch (error) {
      // silently handle storage error
    }
  },

  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
  },

  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  onConfirm() {
    const { avatarUrl, nickname } = this.data;

    if (!nickname || nickname.trim() === '') {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    const userId = generateUUID();

    try {
      wx.setStorageSync('userId', userId);
      wx.setStorageSync('userNickname', nickname.trim());
      wx.setStorageSync('userAvatarUrl', avatarUrl);
      wx.setStorageSync('isLoggedIn', true);

      wx.switchTab({ url: '/pages/mood/mood' });
    } catch (error) {
      wx.showModal({
        title: '错误',
        content: '保存用户信息失败',
        showCancel: false,
        confirmText: '确定'
      });
    }
  },

  onExitMiniProgram() {
    try {
      wx.exitMiniProgram();
    } catch (error) {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  }
});