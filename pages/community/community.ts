// pages/community/community.ts
// ============================================
// 广场页 — 匿名情绪广场
// ============================================

import { getOpenId } from '../../utils/encryption';
import { MOODS, getMoodByKey } from '../../constants/mood';
import {
  CommunityPostDecrypted,
  publishCommunityPost,
  loadCommunityPosts,
  loadTodayActiveCount,
  reactToPost,
  loadMyReactions,  // ✅ 新增
} from '../../utils/cloudDB';

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
    refreshing: false,  // ✅ 新增：专门控制下拉刷新动画

    // 发布弹窗
    showPublishModal: false,
    publishMoods: MOODS,
    publishSelectedMood: '' as string,
    publishContent: '',
    publishContentLength: 0,
    publishing: false,

    // 已回应过的帖子（本地记录，防重复点击）
    reactedMap: {} as Record<string, Record<string, boolean>>,
  },

  onLoad() {},

  onShow() {
    const userId = getOpenId();
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
      const [posts, count, reactedMap] = await Promise.all([
        loadCommunityPosts(this.data.activeMoodFilter || undefined),
        loadTodayActiveCount(),
        loadMyReactions(this.data.userId),
      ]);
  
      const decorated = posts.map(decoratePost);
  
      // ✅ loading: false 和数据更新放在同一个 setData 里
      this.setData({
        loading: false,  // ✅ 先设为 false，让刷新动画停止
        posts: decorated,
        listEmpty: decorated.length === 0,
        todayCount: count,
        reactedMap,
        ready: true,
      });
  
    } catch (e) {
      this.setData({ loading: false });  // ✅ 失败时也要停止
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      // ✅ finally 里不再设置 loading，已经在上面处理了
    }
  },

  // ── 下拉刷新 ──
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.loadAll();
    this.setData({ refreshing: false });
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

  // ============================================
  //  ── 发布弹窗 ──
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

  // ============================================
  // ✅ 修复：预设回应处理函数
  // ============================================
  async onReact(e: WechatMiniprogram.TouchEvent) {
    const { postid, reactionkey } = e.currentTarget.dataset as {
      postid: string;
      reactionkey: ReactionKey;
    };
  
    const { reactedMap, posts } = this.data;
  
    // ✅ 判断当前这个帖子的这个反应是否已点击
    const isReacted = reactedMap[postid]?.[reactionkey] === true;
  
    // ✅ 乐观更新 UI
    const updatedPosts = posts.map((post: any) => {
      if (post._id !== postid) return post;
      return {
        ...post,
        reactionList: post.reactionList.map((r: any) => {
          if (r.key !== reactionkey) return r;
          return { ...r, count: r.count + (isReacted ? -1 : 1) };
        }),
      };
    });
  
    // ✅ 更新 reactedMap，每个反应独立记录
    const updatedReactedMap = {
      ...reactedMap,
      [postid]: {
        ...(reactedMap[postid] || {}),
        [reactionkey]: !isReacted,  // toggle
      },
    };
  
    this.setData({
      posts: updatedPosts,
      reactedMap: updatedReactedMap,
    });
  
    // 请求云端
    const result = await reactToPost(postid, reactionkey);
    if (!result.success) {
      // 云端失败 → 回滚 UI
      this.setData({ posts, reactedMap });
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

});