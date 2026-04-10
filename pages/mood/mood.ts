import { MOODS, getMoodByKey, MoodType } from '../../constants/mood';
import { saveMoodToCloud, loadMoodFromCloud } from '../../utils/cloudDB';
import { getUserId } from '../../utils/encryption';
import { isMember, MEMBERSHIP } from '../../constants/membership';

declare const wx: any;

// ============================================
// Daily Quotes - rotates based on date
// ============================================
const DAILY_QUOTES: string[] = [
  '每一天都是新的开始，微笑面对吧。🌱',
  '你已经做得很好了，继续加油！💪',
  '记录心情，是对自己最好的关怀。🌸',
  '慢慢来，生活不需要急。🍃',
  '今天的你，比昨天更勇敢。✨',
  '允许自己有情绪，这很正常。🌈',
  '小小的快乐，也值得被珍惜。☀️',
  '照顾好自己，才能照顾好一切。🌙',
  '深呼吸，一切都会好起来的。🕊️',
  '你的感受很重要，别忽视它。💙',
  '今天也要好好吃饭，好好休息。🏠',
  '把烦恼写下来，心里会轻松一点。📝',
  '感谢今天遇见的每一个小美好。🌻',
  '不完美的一天，也是完整的一天。🌿',
];

function getDailyQuote(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

interface MoodEntry {
  timestamp: number;
  moodKey: string;
  note?: string;
}

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

// ✅ 新格式：2026年4月10日 星期五
function getDateString(): string {
  const now = new Date();
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayOfWeek = days[now.getDay()];
  return `${year}年${month}月${day}日 ${dayOfWeek}`;
}

function getDayOfWeekLabel(date: Date): string {
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  return labels[(date.getDay() + 6) % 7];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ✅ 根据 moodKey 返回对应 emoji，未打卡返回空字符串
function getMoodEmoji(moodKey: string | undefined): string {
  if (!moodKey) return '';
  const mood = getMoodByKey(moodKey);
  return mood ? mood.emoji : '';
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
    // ✅ 新增 isToday 和 moodEmoji 字段
    weekDays: [] as Array<{
      label: string;
      hasEntry: boolean;
      isToday: boolean;
      moodEmoji: string;
    }>,
    streak: 0,
    greeting: '',
    dateString: '',
    dailyQuote: '',
    noteLimit: MEMBERSHIP.MOOD_NOTE_LIMIT_FREE,
    isMember: false,
  },

  onLoad() {
    const member = isMember();
    this.setData({
      MOODS,
      greeting: getGreeting(),
      dateString: getDateString(),
      dailyQuote: getDailyQuote(),
      isMember: member,
      noteLimit: member
        ? MEMBERSHIP.MOOD_NOTE_LIMIT_MEMBER
        : MEMBERSHIP.MOOD_NOTE_LIMIT_FREE,
    });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const userId = getUserId();
      if (!userId) {
        this.setData({ ready: true });
        wx.redirectTo({ url: '/pages/index/index' });
        return;
      }

      const userNickname = wx.getStorageSync('userNickname') || null;
      const userAvatarUrl = wx.getStorageSync('userAvatarUrl') || null;
      this.setData({ userId, userNickname, userAvatarUrl });

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
    const todayKey = getTodayKey();
    const weekStart = startOfWeek(now);

    // ✅ 新增 isToday 和 moodEmoji
    const weekDays: Array<{
      label: string;
      hasEntry: boolean;
      isToday: boolean;
      moodEmoji: string;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = moodEntries[key];
      weekDays.push({
        label: getDayOfWeekLabel(d),
        hasEntry: !!entry,
        isToday: key === todayKey,
        moodEmoji: getMoodEmoji(entry?.moodKey),
      });
    }

    // ✅ 修复 Streak 计算逻辑
    const todayEntry = moodEntries[todayKey];
    let streak = 0;

    if (todayEntry) {
      streak = 1;
      // 从昨天开始往前逐天检查
      for (let i = 1; i <= 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (moodEntries[key]) {
          streak++;
        } else {
          break;
        }
      }
    }

    this.setData({ weekDays, streak });
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
    const { noteLimit } = this.data;
    if (value.length > noteLimit) {
      this.setData({ note: value.slice(0, noteLimit) });
      wx.showToast({
        title: `最多输入${noteLimit}个字`,
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