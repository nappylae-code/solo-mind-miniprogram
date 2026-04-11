// pages/report/report.ts
// ============================================
// 情绪报告页
// ============================================

import { getUserId } from '../../utils/encryption';
import { loadMoodFromCloud } from '../../utils/cloudDB';
import { getMoodByKey, MOODS, MoodType } from '../../constants/mood';
import { isMember } from '../../constants/membership';

declare const wx: any;

// ============================================
// 类型定义
// ============================================
interface PieSlice {
  emoji: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

interface YearPixelDay {
  date: string;
  color: string;      // 情绪颜色，空字符串表示无记录
  hasEntry: boolean;
}

interface YearPixelMonth {
  label: string;
  days: YearPixelDay[];
}

// ============================================
// 工具函数
// ============================================
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function getYearRange(): { start: string; end: string } {
  const y = new Date().getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function filterEntries(
  entries: Record<string, { moodKey: string; timestamp: number; note?: string }>,
  start: string,
  end: string
): Record<string, { moodKey: string; timestamp: number; note?: string }> {
  const result: typeof entries = {};
  for (const [date, val] of Object.entries(entries)) {
    if (date >= start && date <= end) result[date] = val;
  }
  return result;
}

function buildPieData(
  entries: Record<string, { moodKey: string }>
): PieSlice[] {
  const countMap: Record<string, number> = {};
  for (const { moodKey } of Object.values(entries)) {
    countMap[moodKey] = (countMap[moodKey] || 0) + 1;
  }
  const total = Object.values(countMap).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return MOODS.map((mood: MoodType) => {
    const count = countMap[mood.key] || 0;
    const percent = Math.round((count / total) * 100);
    return { emoji: mood.emoji, label: mood.label, count, percent, color: mood.color };
  }).filter((s) => s.count > 0);
}

function buildYearPixels(
  entries: Record<string, { moodKey: string }>
): YearPixelMonth[] {
  const now = new Date();
  const year = now.getFullYear();
  const months: YearPixelMonth[] = [];

  for (let m = 1; m <= 12; m++) {
    const label = `${m}月`;
    const lastDay = new Date(year, m, 0).getDate();
    const days: YearPixelDay[] = [];

    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries[date];
      const moodObj = entry ? getMoodByKey(entry.moodKey) : undefined;
      days.push({
        date,
        color: moodObj ? moodObj.color : '',
        hasEntry: !!entry,
      });
    }
    months.push({ label, days });
  }
  return months;
}

// ============================================
// Page
// ============================================
Page({
  data: {
    ready: false,
    isMember: false,

    // Tab: 'week' | 'month' | 'year'
    activeTab: 'month' as 'week' | 'month' | 'year',

    // 饼图数据（免费）
    pieData: [] as PieSlice[],
    pieEmpty: false,

    // 年历数据（会员）
    yearPixels: [] as YearPixelMonth[],

    // 全量数据缓存
    allEntries: {} as Record<string, { moodKey: string; timestamp: number; note?: string }>,
  },

  onLoad() {
    this.setData({ isMember: isMember() });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const userId = getUserId();
    if (!userId) {
      wx.navigateBack();
      return;
    }

    wx.showLoading({ title: '加载中...' });
    try {
      const entries = await loadMoodFromCloud(userId);
      this.setData({ allEntries: entries });
      this.computeReport();
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ ready: true });
    }
  },

  computeReport() {
    const { activeTab, allEntries, isMember } = this.data;

    let start: string, end: string;
    if (activeTab === 'week') {
      ({ start, end } = getWeekRange());
    } else if (activeTab === 'month') {
      ({ start, end } = getMonthRange());
    } else {
      ({ start, end } = getYearRange());
    }

    const filtered = filterEntries(allEntries, start, end);
    const pieData  = buildPieData(filtered);

    // 年历只在「本年」tab 且会员时构建
    const yearPixels = (activeTab === 'year' && isMember)
      ? buildYearPixels(allEntries)
      : [];

    this.setData({
      pieData,
      pieEmpty: pieData.length === 0,
      yearPixels,
    });
  },

  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const tab = (e.currentTarget.dataset as { tab: 'week' | 'month' | 'year' }).tab;
    this.setData({ activeTab: tab }, () => {
      this.computeReport();
    });
  },

  onShare() {
    if (!this.data.isMember) {
      wx.showModal({
        title: '💎 会员专属',
        content: '生成分享图片是会员专属功能，升级会员即可使用。',
        cancelText: '取消',
        confirmText: '了解会员',
        success: (res: any) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        },
      });
      return;
    }
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  },

  onNavigateBack() {
    wx.navigateBack();
  },
});