import * as CryptoJS from 'crypto-js';

declare const wx: any;

const FALLBACK_SECRET = 'SoloMind-AES-Secret-2026';

// ============================================
// Override CryptoJS random with wx.getRandomValues
// This fixes "Native crypto module could not be used" error
// in WeChat Mini Program environment
// ============================================
function setupWxCryptoRandom(): void {
  try {
    CryptoJS.lib.WordArray.random = function(nBytes: number): any {
      const words: number[] = [];
      const array = new Uint8Array(nBytes);

      if (typeof wx !== 'undefined' && wx.getRandomValues) {
        wx.getRandomValues({ length: nBytes, success: (res: any) => {
          const randomValues = new Uint8Array(res.randomValues);
          for (let i = 0; i < nBytes; i += 4) {
            words.push(
              ((randomValues[i] || 0) << 24) |
              ((randomValues[i + 1] || 0) << 16) |
              ((randomValues[i + 2] || 0) << 8) |
              (randomValues[i + 3] || 0)
            );
          }
        }});
      } else {
        for (let i = 0; i < nBytes; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        for (let i = 0; i < nBytes; i += 4) {
          words.push(
            ((array[i] || 0) << 24) |
            ((array[i + 1] || 0) << 16) |
            ((array[i + 2] || 0) << 8) |
            (array[i + 3] || 0)
          );
        }
      }

      return CryptoJS.lib.WordArray.create(words, nBytes);
    };
  } catch (e) {
    // ignore setup errors
  }
}

// Run setup immediately
setupWxCryptoRandom();

// ============================================
// Encryption key derived from userId + secret
// ============================================
function getEncryptionKey(): string {
  try {
    const userId = wx.getStorageSync('userId');
    if (userId && userId.length > 0) {
      return CryptoJS.SHA256(userId + FALLBACK_SECRET).toString();
    }
  } catch (e) {
    // fallback
  }
  return CryptoJS.SHA256(FALLBACK_SECRET).toString();
}

// ============================================
// AES Encrypt
// ============================================
function encryptData(plainText: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

// ============================================
// AES Decrypt
// ============================================
function decryptData(cipherText: string): string | null {
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return decrypted;
  } catch (e) {
    return null;
  }
}

// ============================================
// Check if value is AES encrypted
// CryptoJS AES output always starts with "U2FsdGVkX1"
// ============================================
function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith('U2FsdGVkX1');
}

// ============================================
// Save item with AES encryption
// ============================================
export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    const encrypted = encryptData(value);
    wx.setStorageSync(key, encrypted);
  } catch (error) {
    throw error;
  }
}

// ============================================
// Get item and AES decrypt
// Handles backward compatibility with plain text data
// ============================================
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const value = wx.getStorageSync(key);
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (!isEncrypted(value)) {
      return value as string;
    }
    return decryptData(value);
  } catch (error) {
    return null;
  }
}

// ============================================
// Delete item from storage
// ============================================
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    throw error;
  }
}

// ============================================
// SHA256 hash utility
// ============================================
export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString();
}