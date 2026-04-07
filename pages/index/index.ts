Page({
  data: {},

  onShow() {
    try {
      const isLoggedIn = wx.getStorageSync('isLoggedIn');
      if (isLoggedIn) {
        wx.redirectTo({
          url: '/pages/mood/mood'
        });
      } else {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    } catch (error) {
      console.error('Index page error:', error);
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  }
});
