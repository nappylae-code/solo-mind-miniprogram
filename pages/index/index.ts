declare const wx: any;

// ============================================
// Generate a cryptographically secure UUID v4
// Using wx.getRandomValues instead of Math.random()
// ============================================
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
  data: {},

  onShow() {
    try {
      const userId = wx.getStorageSync('userId');
      if (userId) {
        wx.switchTab({
          url: '/pages/mood/mood'
        });
        return;
      }
    } catch (error) {
      // silently handle storage error
    }
  },

  onUseWeChat() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res: any) => {
        const userInfo = res.userInfo;
        const userId = generateUUID();

        try {
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('userNickname', userInfo.nickName);
          wx.setStorageSync('userAvatarUrl', userInfo.avatarUrl);
          wx.setStorageSync('isLoggedIn', true);

          wx.switchTab({
            url: '/pages/mood/mood'
          });
        } catch (error) {
          wx.showModal({
            title: '错误',
            content: '保存用户信息失败',
            showCancel: false,
            confirmText: '确定'
          });
        }
      },
      fail: () => {
        wx.showModal({
          title: '取消授权',
          content: '您取消了授权，无法使用本小程序。',
          showCancel: false,
          confirmText: '确定'
        });
      }
    });
  },

  onExitMiniProgram() {
    try {
      wx.exitMiniProgram();
    } catch (error) {
      wx.redirectTo({
        url: '/pages/index/index'
      });
    }
  }
});