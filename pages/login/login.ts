import { getSecureItem, sha256 } from '../../utils/encryption';

const LOGGED_IN_KEY = 'isLoggedIn';
const USER_EMAIL_KEY = 'userEmail';
const LAST_LOGIN_EMAIL_KEY = 'lastLoginEmail';
const CREDENTIALS_KEY_PREFIX = 'creds_';

Page({
  data: {
    email: '',
    password: '',
    showPassword: false,
    loading: false
  },

  onEmailInput(e: any) {
    this.setData({ email: e.detail.value });
  },

  onPasswordInput(e: any) {
    this.setData({ password: e.detail.value });
  },

  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  async handleLogin() {
    const trimmedEmail = this.data.email.trim().toLowerCase();
    const password = this.data.password;

    if (!trimmedEmail || !password) {
      this.showAlert('错误', '请填写所有字段');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      this.showAlert('错误', '请输入有效的邮箱地址');
      return;
    }

    this.setData({ loading: true });

    try {
      const decrypted = await getSecureItem(CREDENTIALS_KEY_PREFIX + trimmedEmail);
      if (!decrypted) {
        this.showAlert('错误', '找不到该邮箱对应的账号');
        this.setData({ loading: false });
        return;
      }

      const credentials = JSON.parse(decrypted) as { email: string; passwordHash: string };
      const match = sha256(password) === credentials.passwordHash;
      if (!match) {
        this.showAlert('错误', '密码不正确');
        this.setData({ loading: false });
        return;
      }

      wx.setStorageSync(LOGGED_IN_KEY, 'true');
      wx.setStorageSync(USER_EMAIL_KEY, trimmedEmail);
      wx.setStorageSync(LAST_LOGIN_EMAIL_KEY, trimmedEmail);

      this.setData({ loading: false });
      wx.redirectTo({
        url: '/pages/mood/mood'
      });
    } catch (error) {
      console.error('Login error:', error);
      this.showAlert('错误', '登录时发生错误，请重试');
      this.setData({ loading: false });
    }
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  showAlert(title: string, message: string) {
    wx.showModal({
      title,
      content: message,
      showCancel: false,
      confirmText: '确定'
    });
  }
});
