import * as CryptoJS from 'crypto-js';

// Declare WeChat wx API (available globally in Mini Program)
declare const wx: any;

// Simple storage functions without AES encryption
// Password hashing with SHA256 still provides security
export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    console.error('saveSecureItem error for key:', key, error);
    throw error;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const value = wx.getStorageSync(key);
    if (value === undefined || value === null) {
      return null;
    }
    return value as string;
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
