import { saveOpenId, getOpenId } from '../../utils/encryption';

declare const wx: any;

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    loading: false,
  },

  onShow() {
    try {
      // ✅ 用 getOpenId() 解密验证，而不是直接读取原始 Storage
      // 避免把加密密文误判为"已登录"，也防止伪造
      const openId = getOpenId();
      if (openId) {
        wx.switchTab({ url: '/pages/mood/mood' });
        return;
      }
    } catch (error) {}
  },

  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    // ✅ 用户取消时 avatarUrl 为空，直接忽略
    if (!avatarUrl) return;
    this.setData({ avatarUrl });
  },

  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  async onConfirm() {
    const { avatarUrl, nickname, loading } = this.data;

    if (loading) return;

    if (!nickname || nickname.trim() === '') {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '正在进入...' });

    try {
      // ✅ 通过云函数获取 openid
      const result = await wx.cloud.callFunction({ name: 'getOpenId' });
      const openId = result.result.openid;

      if (!openId) {
        throw new Error('获取 openid 失败');
      }

      // ✅ 加密存储 openId
      saveOpenId(openId);
      wx.setStorageSync('userNickname', nickname.trim());
      wx.setStorageSync('userAvatarUrl', avatarUrl);
      wx.setStorageSync('isLoggedIn', true);

      wx.hideLoading();
      wx.switchTab({ url: '/pages/mood/mood' });

    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showModal({
        title: '错误',
        content: '登录失败，请检查网络后重试',
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