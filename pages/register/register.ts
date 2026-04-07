import { saveSecureItem, sha256 } from '../../utils/encryption';

const CREDENTIALS_KEY_PREFIX = 'creds_';

Page({
  data: {
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    loading: false
  },

  onEmailInput(e: any) {
    this.setData({ email: e.detail.value });
  },

  onPasswordInput(e: any) {
    this.setData({ password: e.detail.value });
  },

  onConfirmPasswordInput(e: any) {
    this.setData({ confirmPassword: e.detail.value });
  },

  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  async handleRegister() {
    const trimmedEmail = this.data.email.trim().toLowerCase();
    const password = this.data.password;
    const confirmPassword = this.data.confirmPassword;

    if (!trimmedEmail || !password || !confirmPassword) {
      this.showAlert('错误', '请填写所有字段');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      this.showAlert('错误', '请输入有效的邮箱地址');
      return;
    }

    if (password.length < 6) {
      this.showAlert('错误', '密码至少需要6个字符');
      return;
    }

    if (password !== confirmPassword) {
      this.showAlert('错误', '两次输入的密码不一致');
      return;
    }

    this.setData({ loading: true });

    try {
      const passwordHash = sha256(password);
      const credentials = JSON.stringify({ email: trimmedEmail, passwordHash });
      await saveSecureItem(CREDENTIALS_KEY_PREFIX + trimmedEmail, credentials);

      this.setData({ loading: false });
      wx.showModal({
        title: '成功',
        content: '账号已创建！现在可以登录。',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      this.showAlert('错误', '注册过程中发生错误，请重试。');
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
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
