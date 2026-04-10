// constants/membership.ts
// ============================================
// 会员权限配置
// ============================================

declare const wx: any; // ← 必须在顶部

export const MEMBERSHIP = {
  // 情绪备注字数限制
  MOOD_NOTE_LIMIT_FREE: 50,
  MOOD_NOTE_LIMIT_MEMBER: 100,

  // 日记字数限制
  DIARY_CONTENT_LIMIT_FREE: 500,
  DIARY_CONTENT_LIMIT_MEMBER: 2000,

  // 日记图片（会员专属）
  DIARY_IMAGE_ENABLED: false,
} as const;

// ============================================
// 检查是否是会员
// 目前先返回 false，后续接入真实会员系统
// ============================================
export function isMember(): boolean {
  try {
    const memberStatus = wx.getStorageSync('isMember');
    return memberStatus === true;
  } catch {
    return false;
  }
}