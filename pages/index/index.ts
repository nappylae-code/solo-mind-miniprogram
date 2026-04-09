declare const wx: any;

function generateUUID(): string {
  const array = new Uint8Array(16);

  wx.getRandomValues({
    length: 16,
    success: (res: any) => {
      const randomValues = new Uint8Array(res.randomValues);
      for (let i = 0; i < 16; i++) {
        array[i] = randomValues[i];
      }
    }
  });

  array[6] = (array[6] & 0x0f) | 0x40;
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

  // Called when user picks an avatar
  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
  },

  // Called when user types in nickname input
  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  // Also capture nickname on blur (WeChat fills it on blur)
  onNicknameBlur(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  // Called when user taps "进入 SoloMind"
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