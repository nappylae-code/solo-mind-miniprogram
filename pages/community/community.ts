// pages/community/community.ts
// ============================================
// 广场页 — 匿名情绪广场
// ============================================

import { getUserId } from '../../utils/encryption';
import {
  CommunityPostDecrypted,
  publishCommunityPost,
  loadCommunityPosts,
  loadTodayActiveCount,
  reactToPost,
} from '../../utils/cloudDB';
import { MOODS, getMoodByKey } from '../../constants/mood';

declare const wx: any;

// ============================================
// 常量
// ============================================
const POST_MAX_LENGTH = 50;

const REACTION_TYPES = [
  { key: 'candle',  emoji: '🕯️', label: '我懂' },
  { key: 'hug',    emoji: '🤗', label: '加油' },
  { key: 'sparkle', emoji: '✨', label: '真棒' },
] as const;

type ReactionKey = 'candle' | 'hug' | 'sparkle';

// 情绪筛选列表（全部 + 5种情绪）
const MOOD_FILTERS = [
  { key: '',       label: '全部' },
  { key: 'GREAT',  label: '😄' },
  { key: 'HAPPY',  label: '🙂' },
  { key: 'CALM',   label: '😌' },
  { key: 'SAD',    label: '😢' },
  { key: 'ANGRY',  label: '😠' },
];

// ============================================
// 工具函数
// ============================================
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 将时间戳转为「刚刚 / N分钟前 / N小时前 / N天前」
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return '刚刚';
  if (mins  < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

// 给帖子附加展示用字段
function decoratePost(post: CommunityPostDecrypted): CommunityPostDecrypted & {
  moodEmoji: string;
  timeAgoStr: string;
  reactionList: { key: ReactionKey; emoji: string; label: string; count: number }[];
} {
  const mood = getMoodByKey(post.moodKey);
  return {
    ...post,
    moodEmoji: mood?.emoji ?? '😶',
    timeAgoStr: timeAgo(post.timestamp),
    reactionList: REACTION_TYPES.map((r) => ({
      key:   r.key,
      emoji: r.emoji,
      label: r.label,
      count: post.reactions?.[r.key] ?? 0,
    })),
  };
}

// ============================================
// Page
// ============================================
Page({
  data: {
    ready: false,
    userId: '' as string,

    // 今日活跃
    todayCount: 0,

    // 情绪筛选
    moodFilters: MOOD_FILTERS,
    activeMoodFilter: '',

    // 帖子列表
    posts: [] as ReturnType<typeof decoratePost>[],
    listEmpty: false,
    loading: false,

    // 发布弹窗
    showPublishModal: false,
    publishMoods: MOODS,
    publishSelectedMood: '' as string,
    publishContent: '',
    publishContentLength: 0,
    publishing: false,

    // 已回应过的帖子（本地记录，防重复点击）
    reactedMap: {} as Record<string, ReactionKey>,
  },

  onLoad() {},

  onShow() {
    const userId = getUserId();
    if (!userId) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }
    this.setData({ userId });
    this.loadAll();
  },

  // ── 加载全部数据 ──
  async loadAll() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const [posts, count] = await Promise.all([
        loadCommunityPosts(this.data.activeMoodFilter || undefined),
        loadTodayActiveCount(),
      ]);
      const decorated = posts.map(decoratePost);
      this.setData({
        posts: decorated,
        listEmpty: decorated.length === 0,
        todayCount: count,
        ready: true,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  // ── 下拉刷新 ──
  async onPullDownRefresh() {
    await this.loadAll();
    wx.stopPullDownRefresh();
  },

  // ── 情绪筛选切换 ──
  async onMoodFilterTap(e: WechatMiniprogram.TouchEvent) {
    const key = (e.currentTarget.dataset as { key: string }).key;
    if (key === this.data.activeMoodFilter) return;
    this.setData({ activeMoodFilter: key, posts: [], listEmpty: false });
    await this.loadAll();
  },

  // ============================================
  // 发布弹窗
  // ============================================
  onOpenPublish() {
    this.setData({
      showPublishModal: true,
      publishSelectedMood: '',
      publishContent: '',
      publishContentLength: 0,
    });
  },

  onClosePublish() {
    if (this.data.publishing) return;
    this.setData({ showPublishModal: false });
  },

  onSelectPublishMood(e: WechatMiniprogram.TouchEvent) {
    const key = (e.currentTarget.dataset as { key: string }).key;
    this.setData({ publishSelectedMood: key });
  },

  onPublishInput(e: WechatMiniprogram.Input) {
    const val = e.detail.value;
    if (val.length > POST_MAX_LENGTH) {
      this.setData({
        publishContent: val.slice(0, POST_MAX_LENGTH),
        publishContentLength: POST_MAX_LENGTH,
      });
      wx.showToast({ title: `最多 ${POST_MAX_LENGTH} 字`, icon: 'none' });
      return;
    }
    this.setData({ publishContent: val, publishContentLength: val.length });
  },

  async onPublish() {
    const { publishSelectedMood, publishContent, userId, publishing } = this.data;

    if (publishing) return;

    if (!publishSelectedMood) {
      wx.showToast({ title: '请先选择心情', icon: 'none' });
      return;
    }
    if (!publishContent.trim()) {
      wx.showToast({ title: '说点什么吧', icon: 'none' });
      return;
    }

    this.setData({ publishing: true });
    wx.showLoading({ title: '发布中...' });

    const post: Omit<CommunityPost, '_id'> = {
      userId,           // 已经是 hash 值，不含真实身份
      moodKey: publishSelectedMood,
      content: publishContent.trim(),
      timestamp: Date.now(),
      date: getTodayKey(),
      reactions: { candle: 0, hug: 0, sparkle: 0 },
    };

    wx.hideLoading();
    this.setData({ publishing: false });

    if (ok) {
      this.setData({ showPublishModal: false });
      wx.showToast({ title: '已匿名发布 🌿', icon: 'none', duration: 1800 });
      // 刷新列表
      await this.loadAll();
    } else {
      wx.showToast({ title: '发布失败，请重试', icon: 'none' });
    }
  },

  // ============================================
  // 预设回应
  // ============================================
  async onPublish() {
    const { publishSelectedMood, publishContent, userId, publishing } = this.data;
  
    if (publishing) return;
  
    if (!publishSelectedMood) {
      wx.showToast({ title: '请先选择心情', icon: 'none' });
      return;
    }
    if (!publishContent.trim()) {
      wx.showToast({ title: '说点什么吧', icon: 'none' });
      return;
    }
  
    this.setData({ publishing: true });
    wx.showLoading({ title: '发布中...' });
  
    const ok = await publishCommunityPost(
      userId,
      publishSelectedMood,
      publishContent.trim(),
      getTodayKey()
    );
  
    wx.hideLoading();
    this.setData({ publishing: false });
  
    if (ok) {
      this.setData({ showPublishModal: false });
      wx.showToast({ title: '已匿名发布 🌿', icon: 'none', duration: 1800 });
      await this.loadAll();
    } else {
      wx.showToast({ title: '发布失败，请重试', icon: 'none' });
    }
  },
});