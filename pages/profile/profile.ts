// pages/profile/profile.ts
// ============================================
// 我的主页
// ============================================

import { isMember } from '../../constants/membership';
import { getUserId } from '../../utils/encryption';
import { loadMoodFromCloud, loadDiaryFromCloud } from '../../utils/cloudDB';

declare const wx: any;

// ============================================
// 成就勋章定义
// ============================================
interface Badge {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  unlocked: boolean;
}

const BADGE_DEFINITIONS = [
  { id: 'first_checkin', emoji: '⭐', label: '初次打卡',  desc: '完成第一次情绪打卡' },
  { id: 'streak_7',      emoji: '🔥', label: '7天连续',   desc: '连续打卡 7 天'      },
  { id: 'diary_10',      emoji: '📔', label: '10篇日记',  desc: '累计写了 10 篇日记' },
  { id: 'streak_30',     emoji: '🌟', label: '30天连续',  desc: '连续打卡 30 天'     },
  { id: 'checkin_100',   emoji: '💎', label: '百日坚持',  desc: '累计打卡 100 天'    },
];

// ============================================
// 工具函数
// ============================================
function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getJoinDays(joinTimestamp: number): number {
  const now = Date.now();
  return Math.max(1, Math.floor((now - joinTimestamp) / 86400000) + 1);
}

function computeStreak(
  moodEntries: Record<string, { timestamp: number; moodKey: string; note?: string }>
): number {
  const todayKey = getTodayKey();
  if (!moodEntries[todayKey]) return 0;
  let streak = 1;
  const now = new Date();
  for (let i = 1; i <= 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (moodEntries[key]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeBadges(
  totalCheckin: number,
  totalDiary: number,
  streak: number
): Badge[] {
  return BADGE_DEFINITIONS.map((def) => {
    let unlocked = false;
    if (def.id === 'first_checkin') unlocked = totalCheckin >= 1;
    if (def.id === 'streak_7')      unlocked = streak >= 7;
    if (def.id === 'diary_10')      unlocked = totalDiary >= 10;
    if (def.id === 'streak_30')     unlocked = streak >= 30;
    if (def.id === 'checkin_100')   unlocked = totalCheckin >= 100;
    return { ...def, unlocked };
  });
}

// ============================================
// Page
// ============================================
Page({
  data: {
    ready: false,
    userNickname: '',
    userAvatarUrl: '',
    joinDays: 0,
    totalCheckin: 0,
    totalDiary: 0,
    streak: 0,
    badges: [] as Badge[],
    isMember: false,
  },

  onLoad() {},

  onShow() {
    this.loadData();
  },

  async loadData() {
    const userId = getUserId();
    if (!userId) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }

    const userNickname  = wx.getStorageSync('userNickname')  || '独居者';
    const userAvatarUrl = wx.getStorageSync('userAvatarUrl') || '';
    const joinTimestamp = wx.getStorageSync('joinTimestamp') || Date.now();

    // 首次使用时记录加入时间
    if (!wx.getStorageSync('joinTimestamp')) {
      wx.setStorageSync('joinTimestamp', Date.now());
    }

    wx.showLoading({ title: '加载中...' });

    try {
      const [moodEntries, diaryEntries] = await Promise.all([
        loadMoodFromCloud(userId),
        loadDiaryFromCloud(userId),
      ]);

      const totalCheckin = Object.keys(moodEntries).length;
      const totalDiary   = Object.keys(diaryEntries).length;
      const streak       = computeStreak(moodEntries);
      const joinDays     = getJoinDays(joinTimestamp);
      const badges       = computeBadges(totalCheckin, totalDiary, streak);
      const member       = isMember();

      this.setData({
        ready: true,
        userNickname,
        userAvatarUrl,
        joinDays,
        totalCheckin,
        totalDiary,
        streak,
        badges,
        isMember: member,
      });
    } catch (e) {
      this.setData({ ready: true });
    } finally {
      wx.hideLoading();
    }
  },

  // ── 跳转情绪报告 ──
  goToReport() {
    wx.navigateTo({ url: '/pages/report/report' });
  },

  // ── 会员入口 ──
  goToMembership() {
    wx.showModal({
      title: '💎 SoloMind 会员',
      content: '解锁情绪趋势图、年历、数据导出等全部高级功能。\n\n会员功能即将上线，敬请期待！',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── 数据导出（会员功能）──
  onExportData() {
    if (!this.data.isMember) {
      wx.showModal({
        title: '💎 会员专属',
        content: '数据导出是会员专属功能，升级会员即可使用。',
        cancelText: '取消',
        confirmText: '了解会员',
        success: (res: any) => {
          if (res.confirm) this.goToMembership();
        },
      });
      return;
    }
    wx.showToast({ title: '导出功能开发中', icon: 'none' });
  },

  // ── 隐私设置 ──
  onPrivacySettings() {
    wx.showModal({
      title: '🔒 隐私设置',
      content: '你的所有日记和情绪数据均经过加密存储，仅你本人可以查看。\n\n如需删除全部数据，请联系客服。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── 关于 SoloMind ──
  onAbout() {
    wx.showModal({
      title: '关于 SoloMind 🌿',
      content: 'SoloMind 是一款写给独居者的情绪日记本。\n\n版本：1.0.0\n\n记录每一天的心情，看见真实的自己。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── 帮助与反馈 ──
  onFeedback() {
    wx.showModal({
      title: '📞 帮助与反馈',
      content: '遇到问题或有建议？\n\n请通过微信搜索「SoloMind助手」联系我们，我们会尽快回复。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── 设置按钮（右上角）──
  onSettings() {
    wx.showActionSheet({
      itemList: ['修改昵称', '更换头像'],
      success: (res: any) => {
        if (res.tapIndex === 0) this.onEditNickname();
        if (res.tapIndex === 1) this.onEditAvatar();
      },
    });
  },

  onEditNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: (res: any) => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim().slice(0, 12);
          wx.setStorageSync('userNickname', name);
          this.setData({ userNickname: name });
          wx.showToast({ title: '昵称已更新', icon: 'success' });
        }
      },
    });
  },

  onEditAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res: any) => {
        const path = res.tempFiles[0].tempFilePath;
        wx.setStorageSync('userAvatarUrl', path);
        this.setData({ userAvatarUrl: path });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
    });
  },
});