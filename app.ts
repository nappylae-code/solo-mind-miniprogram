// app.ts
// ============================================
// Polyfill for Node.js crypto module in WeChat Mini Program
// This must run before any module that uses crypto-js
// ============================================

const globalObj = typeof globalThis !== 'undefined' ? globalThis :
  typeof global !== 'undefined' ? global :
  typeof window !== 'undefined' ? window : {} as any;

// Ensure global crypto object exists
if (!globalObj.crypto) {
  (globalObj as any).crypto = {};
}

// Polyfill getRandomValues using wx.getRandomValues
// Removed Math.random() fallback — wx.getRandomValues is always
// available in WeChat Mini Program environment
if (!globalObj.crypto.getRandomValues) {
  globalObj.crypto.getRandomValues = function(array: Uint8Array | Uint16Array | Uint32Array): void {
    if (typeof wx !== 'undefined' && wx.getRandomValues) {
      wx.getRandomValues(array);
    } else {
      // wx is not available — throw error instead of using insecure Math.random()
      throw new Error('wx.getRandomValues is not available. Secure random number generation failed.');
    }
  };
}

// Polyfill randomBytes (used by some crypto-js algorithms)
// Removed Math.random() fallback — wx.getRandomValues is always
// available in WeChat Mini Program environment
if (!globalObj.crypto.randomBytes) {
  globalObj.crypto.randomBytes = function(size: number): any {
    const array = new Uint8Array(size);
    if (typeof wx !== 'undefined' && wx.getRandomValues) {
      wx.getRandomValues(array);
    } else {
      // wx is not available — throw error instead of using insecure Math.random()
      throw new Error('wx.getRandomValues is not available. Secure random number generation failed.');
    }
    return {
      toString: (encoding?: string) => {
        if (encoding === 'hex') {
          return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        let result = '';
        for (let i = 0; i < array.length; i++) {
          result += String.fromCharCode(array[i]);
        }
        return result;
      }
    };
  };
}

// ============================================
// App entry point
// ============================================
App<IAppOption>({
  onLaunch() {
    console.log('SoloMind Mini Program launched');
  },

  globalData: {
    userId: null as string | null,
    isLoggedIn: false
  }
});

// ============================================
// IAppOption interface — fixed to match globalData
// ============================================
interface IAppOption {
  globalData: {
    userId: string | null;    // Fixed: was incorrectly typed as userEmail
    isLoggedIn: boolean;
  };
}