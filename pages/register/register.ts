import { saveSecureItem, sha256 } from '../../utils/encryption';

const CREDENTIALS_KEY_PREFIX = 'creds_';

Page({
  data: {
    email: '',
    password: '',
    confirmPassword: '',
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

  async handleRegister() {
    const trimmedEmail = this.data.email.trim().toLowerCase();
    const password = this.data.password;
    const confirmPassword = this.data.confirmPassword;

    if (!trimmedEmail || !password || !confirmPassword) {
      this.showAlert('Error', 'Please fill in all fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      this.showAlert('Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      this.showAlert('Error', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      this.showAlert('Error', 'Passwords do not match.');
      return;
    }

    this.setData({ loading: true });

    try {
      const passwordHash = sha256(password);
      const credentials = JSON.stringify({ email: trimmedEmail, passwordHash });
      await saveSecureItem(CREDENTIALS_KEY_PREFIX + trimmedEmail, credentials);

      this.setData({ loading: false });
      wx.showModal({
        title: 'Success',
        content: 'Account created! You can now login.',
        showCancel: false,
        confirmText: 'OK',
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      this.showAlert('Error', 'An error occurred during registration. Please try again.');
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
      confirmText: 'OK'
    });
  }
});
