// constants/membership.ts
// ============================================
// 会员权限配置
// ============================================

declare const wx: any; // ← 必须在顶部

export const MEMBERSHIP = {
  // 情绪备注字数限制
  MOOD_NOTE_LIMIT_FREE: 20,
  MOOD_NOTE_LIMIT_MEMBER: 50,

  // 日记字数限制
  DIARY_CONTENT_LIMIT_FREE: 500,
  DIARY_CONTENT_LIMIT_MEMBER: 2000,

  // 日记图片（会员专属）
  DIARY_IMAGE_ENABLED: false,
} as const;

// constants/membership.ts
// 会员系统待第二阶段实现（微信支付 + 云端验证）
// 目前恒返回 false，不做本地存储
export function isMember(): boolean {
  return false;
}