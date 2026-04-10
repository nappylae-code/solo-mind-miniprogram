// pages/diary/diary.ts
import {
  saveDiaryToCloud,
  loadDiaryFromCloud,
  CloudDiaryEntry
} from '../../utils/cloudDB';
import { getUserId } from '../../utils/encryption';
import { isMember, MEMBERSHIP } from '../../constants/membership';

declare const wx: any;

const PREVIEW_LENGTH = 80;

// ============================================
// Daily Prompts - rotates by day of year
// ============================================
const DAILY_PROMPTS: string[] = [
  '今天有没有一件只有独处时才能体验到的事？',
  '今天最让你感到平静的时刻是什么？',
  '如果今天是电影，它的标题会是什么？',
  '今天你给自己做了什么小小的好事？',
  '今天有什么事情让你停下来思考了一下？',
  '今天你最享受的独处时光是什么？',
  '有什么事情今天让你感到轻松了？',
  '今天你注意到了什么平时忽略的细节？',
  '今天最值得记录下来的一件小事是什么？',
  '今天你允许自己做了什么？',
  '今天有没有什么让你微笑的瞬间？',
  '今天你最想对自己说的一句话是什么？',
  '今天有什么新发现，哪怕是很小的事？',
  '今天结束了，你感觉怎么样？',
];

function getDailyPrompt(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey: string): string {
  const parts = dateKey.split('-');
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  return `${month}月${day}日`;
}

function getPreview(content: string): string {
  if (!content) return '';
  return content.length > PREVIEW_LENGTH
    ? content.slice(0, PREVIEW_LENGTH) + '...'
    : content;
}

// ============================================
// Interfaces
// ============================================
interface DiaryEntry {
  date: string;
  displayDate: string;
  content: string;
  preview: string;
  timestamp: number;
}

// ============================================
// Page
// ============================================
Page({
  data: {
    userId: null as string | null,
    isMember: false,
    contentLimit: MEMBERSHIP.DIARY_CONTENT_LIMIT_FREE,
    charCount: 0,
    todayPrompt: '',
    todayContent: '',
    todayKey: '',
    hasTodayEntry: false,
    recentEntries: [] as DiaryEntry[],
    loading: false,
    saving: false,
  },

  onLoad() {
    const member = isMember();
    this.setData({
      todayPrompt: getDailyPrompt(),
      todayKey: getTodayKey(),
      isMember: member,
      contentLimit: member
        ? MEMBERSHIP.DIARY_CONTENT_LIMIT_MEMBER
        : MEMBERSHIP.DIARY_CONTENT_LIMIT_FREE,
    });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const userId = getUserId();
      if (!userId) {
        wx.redirectTo({ url: '/pages/index/index' });
        return;
      }
      this.setData({ userId, loading: true });

      // 使用独立的 diaryEntries collection
      const entries = await loadDiaryFromCloud(userId);
      this.processEntries(entries);
      this.setData({ loading: false });

    } catch (error) {
      this.setData({ loading: false });
    }
  },

  processEntries(
    entries: Record<string, {
      timestamp: number;
      content?: string;
    }>
  ) {
    const todayKey = this.data.todayKey;
    const todayEntry = entries[todayKey];

    this.setData({
      hasTodayEntry: !!todayEntry,
      todayContent: todayEntry?.content || '',
      charCount: (todayEntry?.content || '').length,
    });

    // 过去的日记列表（排除今天，最多显示10条）
    const pastEntries: DiaryEntry[] = Object.entries(entries)
      .filter(([date]) => date !== todayKey)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(([date, entry]) => ({
        date,
        displayDate: formatDisplayDate(date),
        content: entry.content || '',
        preview: getPreview(entry.content || ''),
        timestamp: entry.timestamp,
      }));

    this.setData({ recentEntries: pastEntries });
  },

  onContentInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    const { contentLimit } = this.data;

    if (value.length > contentLimit) {
      this.setData({
        todayContent: value.slice(0, contentLimit),
        charCount: contentLimit,
      });
      wx.showToast({
        title: `最多输入${contentLimit}个字`,
        icon: 'none',
        duration: 1500,
      });
      return;
    }
    this.setData({
      todayContent: value,
      charCount: value.length,
    });
  },

  async onSave() {
    const { userId, todayKey, todayContent, saving } = this.data;

    if (saving) return;

    if (!todayContent || todayContent.trim() === '') {
      wx.showToast({ title: '请写点什么再保存', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      // 使用独立的 saveDiaryToCloud（不含 moodKey）
      const success = await saveDiaryToCloud({
        userId: userId!,
        date: todayKey,
        content: todayContent.trim(),
        timestamp: Date.now(),
      } as CloudDiaryEntry);

      wx.hideLoading();

      if (success) {
        this.setData({ saving: false, hasTodayEntry: true });
        wx.showToast({
          title: '日记已保存 ✓',
          icon: 'none',
          duration: 2000,
        });
      } else {
        this.setData({ saving: false });
        wx.showModal({
          title: '保存失败',
          content: '请检查网络后重试',
          showCancel: false,
          confirmText: '确定',
        });
      }

    } catch (error) {
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showModal({
        title: '保存失败',
        content: '请检查网络后重试',
        showCancel: false,
        confirmText: '确定',
      });
    }
  },

  onUpgradeMember() {
    wx.showToast({ title: '会员功能即将开放', icon: 'none' });
  },
});