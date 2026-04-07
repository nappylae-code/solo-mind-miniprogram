import { getSecureItem, saveSecureItem, deleteSecureItem } from '../../utils/encryption';
import { MOODS, getMoodByKey, MoodType } from '../../constants/mood';

const USER_EMAIL_KEY = 'userEmail';
const LOGGED_IN_KEY = 'isLoggedIn';
const MOOD_DATA_KEY = 'moodData';

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
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels[(date.getDay() + 6) % 7];
}

function formatDateLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
    email: null as string | null,
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
      const email = wx.getStorageSync(USER_EMAIL_KEY);
      if (!email) {
        this.setData({ ready: true });
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }
      this.setData({ email });

      const encryptedData = await getSecureItem(MOOD_DATA_KEY);
      if (encryptedData) {
        try {
          const parsed = JSON.parse(encryptedData);
          let entries: Record<string, MoodEntry>;

          if (Array.isArray(parsed)) {
            // Migrate old array format to object format
            entries = {};
            for (const entry of parsed) {
              const d = new Date(entry.timestamp);
              const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              entries[dateKey] = { timestamp: entry.timestamp, moodKey: entry.moodKey };
            }
            await saveSecureItem(MOOD_DATA_KEY, JSON.stringify(entries));
          } else {
            entries = parsed;
          }

          // Clean up old email-specific key (for backward compatibility)
          await deleteSecureItem('moodData_' + email);

          this.setData({ moodEntries: entries });
        } catch (err) {
          console.error('Error parsing mood data:', err);
          this.setData({ moodEntries: {} });
        }
      } else {
        this.setData({ moodEntries: {} });
      }

      this.computeWeekData();
      this.syncTodayEntry();
      this.setData({ ready: true });
    } catch (error) {
      console.error('loadData error:', error);
      this.setData({ ready: true });
    }
  },

  computeWeekData() {
    const { moodEntries } = this.data;
    const now = new Date();
    let weekStart = startOfWeek(now);

    // Build current week days
    let currentWeekDays: Array<{ label: string; hasEntry: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hasEntry = !!moodEntries[key];
      currentWeekDays.push({ label: getDayOfWeekLabel(d), hasEntry });
    }

    // If no entries in current week, look at next week
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
        if (moodEntries[key]) {
          foundNext = true;
        }
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

    this.setData({
      weekDays: currentWeekDays,
      weekLabel,
      streak
    });
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
    const moodKey = (e.currentTarget as any).dataset.moodKey;
    this.setData({
      selectedMood: moodKey,
      selectedMoodObj: getMoodByKey(moodKey) || null
    });
  },

  onNoteInput(e: any) {
    this.setData({ note: e.detail.value });
  },

  async handleSave() {
    const { selectedMood, note, moodEntries } = this.data;
    if (!selectedMood) {
      wx.showModal({
        title: '提示',
        content: '请先选择今天的心情',
        showCancel: false,
        confirmText: 'OK'
      });
      return;
    }

    const todayKey = getTodayKey();
    const updated = {
      ...moodEntries,
      [todayKey]: {
        timestamp: Date.now(),
        moodKey: selectedMood,
        note: note.trim() || undefined
      }
    };

    try {
      await saveSecureItem(MOOD_DATA_KEY, JSON.stringify(updated));
      this.setData({ moodEntries: updated });
      this.computeWeekData();
      wx.showModal({
        title: '已保存！',
        content: '今天的心情已记录',
        showCancel: false,
        confirmText: 'OK'
      });
    } catch (error) {
      console.error('Save error:', error);
      wx.showModal({
        title: '错误',
        content: '保存失败，请重试',
        showCancel: false,
        confirmText: 'OK'
      });
    }
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(LOGGED_IN_KEY);
          wx.removeStorageSync(USER_EMAIL_KEY);
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});
