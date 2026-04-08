// Helper to generate a UUID v4
function generateUUID(): string {
  const hex = '0123456789abcdef';
  let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return hex[v];
  });
  return uuid;
}

Page({
  data: {},

  onShow() {
    // Check if user already signed up
    try {
      const userId = wx.getStorageSync('userId');
      if (userId) {
        // Already have user, go to mood page
        wx.redirectTo({
          url: '/pages/mood/mood'
        });
        return;
      }
    } catch (error) {
      console.error('Error checking userId:', error);
    }
    // No user, stay on this consent page
  },

  onUseWeChat() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = res.userInfo;
        const userId = generateUUID();

        try {
          wx.setStorageSync('userId', userId);
          wx.setStorageSync('userNickname', userInfo.nickName);
          wx.setStorageSync('userAvatarUrl', userInfo.avatarUrl);
          wx.setStorageSync('isLoggedIn', true);

          wx.redirectTo({
            url: '/pages/mood/mood'
          });
        } catch (error) {
          console.error('Storage error:', error);
          wx.showModal({
            title: '错误',
            content: '保存用户信息失败',
            showCancel: false,
            confirmText: '确定'
          });
        }
      },
      fail: (err) => {
        console.error('getUserProfile failed:', err);
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
      console.error('exitMiniProgram error:', error);
      // Fallback: maybe close by navigating to empty page?
      wx.redirectTo({
        url: '/pages/index/index'
      });
    }
  }
});
