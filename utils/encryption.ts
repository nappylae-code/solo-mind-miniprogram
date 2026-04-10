import * as CryptoJS from 'crypto-js';
import config from '../config';

declare const wx: any;

const FALLBACK_SECRET = config.AES_SECRET_KEY;
const USER_ID_STORAGE_KEY = 'userId';

// ============================================
// 问题2修复：用同步方式调用 wx.getRandomValues
// 直接传入 TypedArray，wx 会同步写入随机数
// 不使用 callback，避免异步导致 IV 为空的问题
// ============================================
function getRandomBytes(nBytes: number): Uint8Array {
  const buf = new Uint8Array(nBytes);
  if (typeof wx !== 'undefined' && wx.getRandomValues) {
    wx.getRandomValues(buf); // 同步写入，无 callback
  } else {
    throw new Error('wx.getRandomValues is not available.');
  }
  return buf;
}

// ============================================
// 将 Uint8Array 转为 CryptoJS WordArray
// ============================================
function uint8ArrayToWordArray(u8arr: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < u8arr.length; i += 4) {
    words.push(
      ((u8arr[i] || 0) << 24) |
      ((u8arr[i + 1] || 0) << 16) |
      ((u8arr[i + 2] || 0) << 8) |
      (u8arr[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, u8arr.length);
}

// ============================================
// 问题2修复：覆盖 CryptoJS 随机函数
// 使用同步版本，确保 IV 真正随机
// ============================================
CryptoJS.lib.WordArray.random = function (nBytes: number): CryptoJS.lib.WordArray {
  const buf = getRandomBytes(nBytes);
  return uint8ArrayToWordArray(buf);
};

// ============================================
// 问题1修复：返回真正的 256-bit WordArray
// 而不是 hex 字符串，确保密钥强度
// ============================================
function getEncryptionKeyWordArray(): CryptoJS.lib.WordArray {
  try {
    const userId = wx.getStorageSync(USER_ID_STORAGE_KEY);
    if (userId && userId.length > 0) {
      // SHA256(userId + secret) → 256-bit WordArray
      return CryptoJS.SHA256(userId + FALLBACK_SECRET);
    }
  } catch (e) {
    // fallback
  }
  return CryptoJS.SHA256(FALLBACK_SECRET);
}

// ============================================
// 问题1修复：AES 加密
// key 使用 WordArray，IV 使用真随机 16 bytes
// 输出格式：iv_hex:ciphertext_base64
// ============================================
function encryptData(plainText: string): string {
  const key = getEncryptionKeyWordArray();
  const ivBytes = getRandomBytes(16);
  const iv = uint8ArrayToWordArray(ivBytes);

  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 把 IV 和密文一起存储，解密时需要用到
  const ivHex = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return ivHex + ':' + encrypted.toString();
}

// ============================================
// 问题1修复：AES 解密
// 从存储的字符串中分离 IV 和密文
// 兼容旧格式（无 IV 前缀的旧数据）
// ============================================
function decryptData(cipherText: string): string | null {
  try {
    const key = getEncryptionKeyWordArray();

    let iv: CryptoJS.lib.WordArray;
    let cipher: string;

    if (cipherText.includes(':')) {
      // ✅ 新格式：iv_hex:ciphertext
      const [ivHex, ct] = cipherText.split(':');
      const ivBytes = new Uint8Array(ivHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
      iv = uint8ArrayToWordArray(ivBytes);
      cipher = ct;
    } else {
      // 兼容旧格式（IV 全为 0，旧数据向下兼容）
      iv = CryptoJS.lib.WordArray.create(new Array(4).fill(0), 16);
      cipher = cipherText;
    }

    const bytes = CryptoJS.AES.decrypt(cipher, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (e) {
    return null;
  }
}

// ============================================
// Check if value is AES encrypted
// 新格式：32位iv_hex + ':' + 'U2FsdGVkX1...'
// 旧格式：直接以 'U2FsdGVkX1' 开头
// ============================================
function isEncrypted(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith('U2FsdGVkX1')) return true; // 旧格式兼容
  if (value.includes(':')) {
    const [ivHex] = value.split(':');
    return ivHex.length === 32 && /^[0-9a-f]+$/.test(ivHex); // 新格式
  }
  return false;
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
// ============================================
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const value = wx.getStorageSync(key);
    if (value === undefined || value === null || value === '') return null;
    if (!isEncrypted(value)) return value as string;
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
// Save userId（用固定 secret 派生的 key，避免鸡生蛋问题）
// ============================================
export function saveUserId(userId: string): void {
  // userId 加密用固定 key（不能依赖 userId 本身）
  const key = CryptoJS.SHA256(FALLBACK_SECRET); // ✅ WordArray
  const ivBytes = getRandomBytes(16);
  const iv = uint8ArrayToWordArray(ivBytes);

  const encrypted = CryptoJS.AES.encrypt(userId, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivHex = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  wx.setStorageSync(USER_ID_STORAGE_KEY, ivHex + ':' + encrypted.toString());
}

// ============================================
// Get and decrypt userId
// ============================================
export function getUserId(): string | null {
  try {
    const value = wx.getStorageSync(USER_ID_STORAGE_KEY);
    if (!value) return null;

    const key = CryptoJS.SHA256(FALLBACK_SECRET); // ✅ WordArray

    let iv: CryptoJS.lib.WordArray;
    let cipher: string;

    if (value.includes(':')) {
      // 新格式
      const [ivHex, ct] = value.split(':');
      const ivBytes = new Uint8Array(ivHex.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));
      iv = uint8ArrayToWordArray(ivBytes);
      cipher = ct;
    } else if (isEncrypted(value)) {
      // 旧格式兼容
      iv = CryptoJS.lib.WordArray.create(new Array(4).fill(0), 16);
      cipher = value;
    } else {
      // 明文旧数据
      return value;
    }

    const bytes = CryptoJS.AES.decrypt(cipher, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch (e) {
    return null;
  }
}

// ============================================
// Encrypt a single field (for cloudDB use)
// ============================================
export function encryptField(plainText: string): string {
  return encryptData(plainText);
}

// ============================================
// Decrypt a single field (for cloudDB use)
// ============================================
export function decryptField(cipherText: string): string | null {
  return decryptData(cipherText);
}