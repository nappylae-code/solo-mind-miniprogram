import * as CryptoJS from 'crypto-js';

// Declare WeChat wx API (available globally in Mini Program)
declare const wx: any;

const ENCRYPTION_KEY = 'mood-checkin-aes-key-2025';

export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    wx.setStorageSync(key, encrypt(value));
  } catch (error) {
    console.error('saveSecureItem error for key:', key, error);
    throw error;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const encrypted = wx.getStorageSync(key);
    if (encrypted === undefined || encrypted === null) {
      return null;
    }
    return decrypt(encrypted as string);
  } catch (error) {
    console.error('getSecureItem error for key:', key, error);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    console.error('deleteSecureItem error for key:', key, error);
    throw error;
  }
}

export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString();
}
