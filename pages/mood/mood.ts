import { MOODS, getMoodByKey, MoodType } from '../../constants/mood';
import { saveMoodToCloud, loadMoodFromCloud } from '../../utils/cloudDB';

declare const wx: any;

const USER_ID_KEY = 'userId';
const NOTE_MAX_LENGTH = 500;

interface MoodEntry {
  timestamp: number;
  moodKey: string;
  note?: string;
}

// Utility functions
function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfWeekLabel(date: Date): string {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return labels[(date.getDay() + 6) % 7];
}

function formatDateLabel(date: Date): string {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

Page({
  data: {
    userId: null as string | null,
    userNickname: null as string | null,
    userAvatarUrl: null as string | null,
    ready: false,
    MOODS: [] as MoodType[],
    moodEntries: {} as Record<string, MoodEntry>,
    selectedMood: null as string | null,
    selectedMoodObj: null as MoodType | null,
    note: '',
    weekDays: [] as Array<{ label: string; hasEntry: boolean }>,
    weekLabel: '',
    streak: 0
  },

  onLoad() {
    this.setData({ MOODS });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const userId = wx.getStorageSync(USER_ID_KEY);
      if (!userId) {
        this.setData({ ready: true });
        wx.redirectTo({ url: '/pages/index/index' });
        return;
      }

      const userNickname = wx.getStorageSync('userNickname') || null;
      const userAvatarUrl = wx.getStorageSync('userAvatarUrl') || null;
      this.setData({ userId, userNickname, userAvatarUrl });

      // Load mood entries from Cloud DB
      wx.showLoading({ title: '加载中...' });
      const entries = await loadMoodFromCloud(userId);
      wx.hideLoading();

      this.setData({ moodEntries: entries });
      this.computeWeekData();
      this.syncTodayEntry();
      this.setData({ ready: true });

    } catch (error) {
      wx.hideLoading();
      this.setData({ ready: true });
    }
  },

  computeWeekData() {
    const { moodEntries } = this.data;
    const now = new Date();
    let weekStart = startOfWeek(now);

    let currentWeekDays: Array<{ label: string; hasEntry: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      currentWeekDays.push({ label: getDayOfWeekLabel(d), hasEntry: !!moodEntries[key] });
    }

    const foundInWeek = currentWeekDays.some(day => day.hasEntry);
    if (!foundInWeek) {
      const nextWeekStart = new Date(weekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      let nextWeekDays: Array<{ label: string; hasEntry: boolean }> = [];
      let foundNext = false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(nextWeekStart);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (moodEntries[key]) foundNext = true;
        nextWeekDays.push({ label: getDayOfWeekLabel(d), hasEntry: !!moodEntries[key] });
      }
      if (foundNext) {
        weekStart = nextWeekStart;
        currentWeekDays = nextWeekDays;
      }
    }

    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
    const weekLabel = `${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd)}`;

    // Compute streak
    const todayKey = getTodayKey();
    const todayEntry = moodEntries[todayKey];
    let streak = todayEntry ? 1 : 0;
    const yesterday = new Date(todayKey);
    yesterday.setDate(yesterday.getDate() - 1);
    for (let i = 0; i < 30; i++) {
      const d = new Date(yesterday);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (moodEntries[key]) {
        streak++;
      } else {
        break;
      }
    }

    this.setData({ weekDays: currentWeekDays, weekLabel, streak });
  },

  syncTodayEntry() {
    const { moodEntries } = this.data;
    const todayKey = getTodayKey();
    const todayEntry = moodEntries[todayKey];
    if (todayEntry) {
      this.setData({
        selectedMood: todayEntry.moodKey,
        selectedMoodObj: getMoodByKey(todayEntry.moodKey) || null,
        note: todayEntry.note || ''
      });
    } else {
      this.setData({
        selectedMood: null,
        selectedMoodObj: null,
        note: ''
      });
    }
  },

  onSelectMood(e: WechatMiniprogram.TouchEvent) {
    const moodKey = (e.currentTarget.dataset as { moodKey: string }).moodKey;
    this.setData({
      selectedMood: moodKey,
      selectedMoodObj: getMoodByKey(moodKey) || null
    });
  },

  onNoteInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    if (value.length > NOTE_MAX_LENGTH) {
      this.setData({ note: value.slice(0, NOTE_MAX_LENGTH) });
      wx.showToast({
        title: `最多输入${NOTE_MAX_LENGTH}个字`,
        icon: 'none',
        duration: 1500
      });
      return;
    }
    this.setData({ note: value });
  },

  async handleSave() {
    const { selectedMood, note, moodEntries, userId } = this.data;
    if (!selectedMood) {
      wx.showModal({
        title: '提示',
        content: '请先选择今天的心情',
        showCancel: false,
        confirmText: '确定'
      });
      return;
    }

    const todayKey = getTodayKey();

    // Save to Cloud DB
    wx.showLoading({ title: '保存中...' });
    const success = await saveMoodToCloud({
      userId: userId!,
      date: todayKey,
      moodKey: selectedMood,
      note: note.trim(),
      timestamp: Date.now()
    });
    wx.hideLoading();

    if (success) {
      const updated = {
        ...moodEntries,
        [todayKey]: {
          timestamp: Date.now(),
          moodKey: selectedMood,
          note: note.trim() || undefined
        }
      };
      this.setData({ moodEntries: updated });
      this.computeWeekData();
      wx.showModal({
        title: '已保存！',
        content: '今天的心情已记录',
        showCancel: false,
        confirmText: '确定'
      });
    } else {
      wx.showModal({
        title: '错误',
        content: '保存失败，请检查网络后重试',
        showCancel: false,
        confirmText: '确定'
      });
    }
  }
});