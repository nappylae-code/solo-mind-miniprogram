// app.ts
// ============================================
// Polyfill for Node.js crypto module in WeChat Mini Program
// This must run before any module that uses crypto-js
// ============================================

const globalObj = typeof globalThis !== 'undefined' ? globalThis :
                  typeof global !== 'undefined' ? global :
                  typeof window !== 'undefined' ? window : {};

// Ensure global crypto object exists
if (!globalObj.crypto) {
  (globalObj as any).crypto = {};
}

// Polyfill getRandomValues using wx.getRandomValues
if (!globalObj.crypto.getRandomValues) {
  globalObj.crypto.getRandomValues = function(array: Uint8Array | Uint16Array | Uint32Array): void {
    if (typeof wx !== 'undefined' && wx.getRandomValues) {
      wx.getRandomValues(array);
    } else {
      // Fallback to Math.random if wx is not available
      for (let i = 0; i < array.length; i++) {
        const max = array[i] instanceof Uint8Array ? 256 :
                    array[i] instanceof Uint16Array ? 65536 : 4294967296;
        array[i] = Math.floor(Math.random() * max);
      }
    }
  };
}

// Polyfill randomBytes (used by some crypto-js algorithms)
if (!globalObj.crypto.randomBytes) {
  globalObj.crypto.randomBytes = function(size: number): any {
    const array = new Uint8Array(size);
    if (typeof wx !== 'undefined' && wx.getRandomValues) {
      wx.getRandomValues(array);
    } else {
      for (let i = 0; i < size; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return {
      toString: (encoding?: string) => {
        if (encoding === 'hex') {
          return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        // Basic UTF-8 decode for non-hex
        let result = '';
        for (let i = 0; i < array.length; i++) {
          result += String.fromCharCode(array[i]);
        }
        return result;
      }
    };
  };
}

App<IAppOption>({
  onLaunch() {
    console.log('SoloMind Mini Program launched');
  },

  globalData: {
    userEmail: null as string | null,
    isLoggedIn: false
  }
})

interface IAppOption {
  globalData: {
    userEmail: string | null;
    isLoggedIn: boolean;
  };
}
