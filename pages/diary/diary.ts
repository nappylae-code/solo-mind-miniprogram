import {
  loadDiaryFromCloud,
  loadDiaryFromCache,      // ✅ 新增
  isDiaryCacheExpired,     // ✅ 新增
} from '../../utils/cloudDB';
import { getOpenId } from '../../utils/encryption';
import { getMoodByKey } from '../../constants/mood';

declare const wx: any;

const PREVIEW_LENGTH = 40;

// ============================================
// 工具函数
// ============================================
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatFullDate(dateKey: string): string {
  const parts = dateKey.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日 ${days[d.getDay()]}`;
}

function formatMonthGroup(dateKey: string): string {
  const parts = dateKey.split('-');
  return `${parts[0]}年${parseInt(parts[1])}月`;
}

function getPreview(content: string): string {
  if (!content) return '';
  return content.length > PREVIEW_LENGTH
    ? content.slice(0, PREVIEW_LENGTH) + '...'
    : content;
}

// DiaryItem interface 移除 moodImage / moodKey
interface DiaryItem {
  date: string;
  displayDate: string;
  preview: string;
  content: string;
  timestamp: number;
}

interface MonthGroup {
  monthLabel: string;
  entries: DiaryItem[];
}

// ============================================
// 情绪筛选 Tab
// ============================================
const MOOD_FILTERS = [
  { key: 'ALL',   label: '全部', image: '' },
  { key: 'GREAT', label: '极好', image: '/assets/moods/great.png' },
  { key: 'HAPPY', label: '开心', image: '/assets/moods/happy.png' },
  { key: 'CALM',  label: '平静', image: '/assets/moods/calm.png'  },
  { key: 'SAD',   label: '难过', image: '/assets/moods/sad.png'   },
  { key: 'ANGRY', label: '生气', image: '/assets/moods/angry.png' },
];

Page({
  data: {
    userId: null as string | null,
    loading: false,
    allEntries: [] as DiaryItem[],       // 全量数据
    monthGroups: [] as MonthGroup[],     // 渲染用分组数据
    searchKeyword: '',
    activeMoodFilter: 'ALL',
    moodFilters: MOOD_FILTERS,
  },

  onLoad() {},

  onShow() {
    this.loadData();
  },

  async loadData() {
    const userId = getOpenId();
    if (!userId) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }
    this.setData({ userId });
  
    // ✅ 第一步：优先读取本地缓存，立即渲染
    const cached = loadDiaryFromCache();
    if (cached) {
      const list = this.buildDiaryList(cached);
      this.setData({ allEntries: list, loading: false });
      this.applyFilter();
    }
  
    // ✅ 第二步：缓存过期才请求云端
    if (isDiaryCacheExpired()) {
      if (!cached) {
        this.setData({ loading: true });
        wx.showLoading({ title: '加载中...' });
      }
  
      try {
        const entries = await loadDiaryFromCloud(userId);
        const list = this.buildDiaryList(entries);
        this.setData({ allEntries: list });
        this.applyFilter();
      } catch (e) {
        wx.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        wx.hideLoading();
        this.setData({ loading: false });
      }
    }
  },

  // ============================================
  // 搜索
  // ============================================
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilter();
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.applyFilter();
  },

  // ============================================
  // 情绪筛选
  // ============================================
  onMoodFilterTap(e: WechatMiniprogram.TouchEvent) {
    const key = (e.currentTarget.dataset as { key: string }).key;
    this.setData({ activeMoodFilter: key });
    this.applyFilter();
  },

  // ============================================
  // 筛选 + 分组逻辑
  // ============================================
  applyFilter() {
    const { allEntries, activeMoodFilter, searchKeyword } = this.data;

    let filtered = allEntries;

    // 情绪筛选
    if (activeMoodFilter !== 'ALL') {
      filtered = filtered.filter(e => e.moodKey === activeMoodFilter);
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(e =>
        e.content.toLowerCase().includes(kw) ||
        e.displayDate.includes(kw)
      );
    }

    // 按月分组
    const groupMap: Record<string, DiaryItem[]> = {};
    for (const entry of filtered) {
      const monthLabel = formatMonthGroup(entry.date);
      if (!groupMap[monthLabel]) groupMap[monthLabel] = [];
      groupMap[monthLabel].push(entry);
    }

    const monthGroups: MonthGroup[] = Object.entries(groupMap).map(([monthLabel, entries]) => ({
      monthLabel,
      entries,
    }));

    this.setData({ monthGroups });
  },

  // ============================================
  // 跳转详情
  // ============================================
  onEntryTap(e: WechatMiniprogram.TouchEvent) {
    const date = (e.currentTarget.dataset as { date: string }).date;
    wx.navigateTo({
      url: `/pages/diary/diary-detail?date=${date}`,
    });
  },

  // ============================================
  // FAB：新建日记 → 跳转编辑页
  // ============================================
  onNewDiary() {
    const todayKey = getTodayKey();
    wx.navigateTo({
      url: `/pages/diary/diary-edit?date=${todayKey}&isNew=true`,
    });
  },

  // ✅ 新增：抽取列表构建逻辑为独立函数，避免重复代码
  buildDiaryList(entries: Record<string, any>): DiaryItem[] {
    return Object.entries(entries)
      .sort(([, a], [, b]) => (b as any).timestamp - (a as any).timestamp)
      .map(([date, entry]: [string, any]) => ({
        date,
        displayDate: formatFullDate(date),
        preview: getPreview(entry.content || ''),
        content: entry.content || '',
        timestamp: entry.timestamp,
      }));
  },

});