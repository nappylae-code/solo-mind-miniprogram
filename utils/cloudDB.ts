// utils/cloudDB.ts
// ============================================
// Cloud Database utility
// moodEntries: 情绪打卡（note 加密存储）
// diaryEntries: 日记（content 加密存储）
// ============================================

import { encryptField, decryptField } from './encryption';

declare const wx: any;

// ============================================
// Collection Names
// ============================================
const MOOD_COLLECTION = 'moodEntries';
const DIARY_COLLECTION = 'diaryEntries';

const MOOD_CACHE_KEY = 'moodEntriesCache';
const DIARY_CACHE_KEY = 'diaryEntriesCache';

// ============================================
// Interfaces
// ============================================
export interface CloudMoodEntry {
  _id?: string;
  userId: string;
  date: string;
  moodKey: string;   // 明文（枚举值，无隐私）
  note: string;      // 明文输入，保存时加密
  timestamp: number;
}

export interface CloudDiaryEntry {
  _id?: string;
  userId: string;
  date: string;
  content: string;   // 明文输入，保存时加密
  moodKey?: string;
  timestamp: number;
}

// ============================================
// MOOD — Save
// 加密 note 后存入 moodEntries
// ============================================
export async function saveMoodToCloud(
  entry: CloudMoodEntry
): Promise<boolean> {
  try {
    const db = wx.cloud.database();

    // 加密 note
    const encryptedNote = entry.note
      ? encryptField(entry.note)
      : '';

    // 检查是否已有当日记录
    const { data } = await db
      .collection(MOOD_COLLECTION)
      .where({ userId: entry.userId, date: entry.date })
      .get();

    if (data && data.length > 0) {
      // 更新：同时用 remove() 清除旧的明文 note 字段
      await db
        .collection(MOOD_COLLECTION)
        .doc(data[0]._id)
        .update({
          data: {
            moodKey: entry.moodKey,
            encryptedNote: encryptedNote,
            timestamp: entry.timestamp,
            note: db.command.remove(), // 清除旧明文字段
          },
        });
    } else {
      // 新建：只存加密字段，不存 note 明文
      await db.collection(MOOD_COLLECTION).add({
        data: {
          userId: entry.userId,
          date: entry.date,
          moodKey: entry.moodKey,
          encryptedNote: encryptedNote,
          timestamp: entry.timestamp,
        },
      });
    }

    // 更新本地缓存（缓存明文，仅本地使用）
    _updateMoodCache(entry);
    return true;

  } catch (error) {
    return false;
  }
}

// ============================================
// MOOD — Load
// 从云端读取并解密 note
// ============================================
export async function loadMoodFromCloud(
  userId: string
): Promise<Record<string, {
  timestamp: number;
  moodKey: string;
  note?: string;
}>> {
  try {
    const db = wx.cloud.database();
    const { data } = await db
      .collection(MOOD_COLLECTION)
      .where({ userId })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const entries: Record<string, {
      timestamp: number;
      moodKey: string;
      note?: string;
    }> = {};

    if (data && data.length > 0) {
      for (const item of data) {
        // 优先解密 encryptedNote，兼容旧明文 note
        let note = '';
        if (item.encryptedNote) {
          note = decryptField(item.encryptedNote) ?? '';
        } else if (item.note) {
          note = item.note; // 旧数据向下兼容
        }

        entries[item.date] = {
          timestamp: item.timestamp,
          moodKey: item.moodKey,
          note: note || undefined,
        };
      }
    }

    wx.setStorageSync(MOOD_CACHE_KEY, JSON.stringify(entries));
    return entries;

  } catch (error) {
    // 降级到本地缓存
    try {
      const cached = wx.getStorageSync(MOOD_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  }
}

// ============================================
// DIARY — Save
// 加密 content 后存入 diaryEntries
// ============================================
export async function saveDiaryToCloud(
  entry: CloudDiaryEntry
): Promise<boolean> {
  try {
    const db = wx.cloud.database();

    // 加密 content
    const encryptedContent = entry.content
      ? encryptField(entry.content)
      : '';

    // 检查是否已有当日记录
    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId: entry.userId, date: entry.date })
      .get();

    if (data && data.length > 0) {
      await db
        .collection(DIARY_COLLECTION)
        .doc(data[0]._id)
        .update({
          data: {
            encryptedContent: encryptedContent,
            moodKey: entry.moodKey || '',
            timestamp: entry.timestamp,
          },
        });
    } else {
      await db.collection(DIARY_COLLECTION).add({
        data: {
          userId: entry.userId,
          date: entry.date,
          encryptedContent: encryptedContent,
          moodKey: entry.moodKey || '',
          timestamp: entry.timestamp,
        },
      });
    }

    // 更新本地缓存
    _updateDiaryCache(entry);
    return true;

  } catch (error) {
    return false;
  }
}

// ============================================
// DIARY — Load
// 从云端读取并解密 content
// ============================================
export async function loadDiaryFromCloud(
  userId: string
): Promise<Record<string, {
  timestamp: number;
  content?: string;
  moodKey?: string;
}>> {
  try {
    const db = wx.cloud.database();
    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const entries: Record<string, {
      timestamp: number;
      content?: string;
    }> = {};

    if (data && data.length > 0) {
      for (const item of data) {
        const content = item.encryptedContent
          ? decryptField(item.encryptedContent) ?? ''
          : '';

        entries[item.date] = {
          timestamp: item.timestamp,
          content: content || undefined,
          moodKey: item.moodKey || undefined,
        };
      }
    }

    wx.setStorageSync(DIARY_CACHE_KEY, JSON.stringify(entries));
    return entries;

  } catch (error) {
    try {
      const cached = wx.getStorageSync(DIARY_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  }
}

// ============================================
// 本地缓存辅助函数
// ============================================
function _updateMoodCache(entry: CloudMoodEntry): void {
  try {
    const cached = wx.getStorageSync(MOOD_CACHE_KEY);
    const entries = cached ? JSON.parse(cached) : {};
    entries[entry.date] = {
      timestamp: entry.timestamp,
      moodKey: entry.moodKey,
      note: entry.note || undefined,
    };
    wx.setStorageSync(MOOD_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

function _updateDiaryCache(entry: CloudDiaryEntry): void {
  try {
    const cached = wx.getStorageSync(DIARY_CACHE_KEY);
    const entries = cached ? JSON.parse(cached) : {};
    entries[entry.date] = {
      timestamp: entry.timestamp,
      content: entry.content || undefined,
      moodKey: entry.moodKey || undefined,
    };
    wx.setStorageSync(DIARY_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

// ============================================
// DIARY — Delete
// ============================================
export async function deleteDiaryFromCloud(
  userId: string,
  date: string
): Promise<boolean> {
  try {
    const db = wx.cloud.database();
    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId, date })
      .get();

    if (data && data.length > 0) {
      await db.collection(DIARY_COLLECTION).doc(data[0]._id).remove();
    }
    // 更新本地缓存
    try {
      const cached = wx.getStorageSync(DIARY_CACHE_KEY);
      if (cached) {
        const entries = JSON.parse(cached);
        delete entries[date];
        wx.setStorageSync(DIARY_CACHE_KEY, JSON.stringify(entries));
      }
    } catch {}
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// COMMUNITY — 广场相关
// ============================================

const COMMUNITY_COLLECTION = 'communityPosts';

export interface CommunityPost {
  _id?: string;
  userId: string;       // 匿名化后的 hash userId，不可反查真实用户
  moodKey: string;
  content: string;      // 明文（用户主动公开，无隐私）
  timestamp: number;
  date: string;         // YYYY-MM-DD
  reactions: {
    candle: number;     // 🕯️ 我懂
    hug: number;        // 🤗 加油
    sparkle: number;    // ✨ 真棒
  };
}

// ── 发布匿名帖子 ──
export async function publishCommunityPost(
  post: Omit<CommunityPost, '_id'>
): Promise<boolean> {
  try {
    const db = wx.cloud.database();
    await db.collection(COMMUNITY_COLLECTION).add({ data: post });
    return true;
  } catch (error) {
    return false;
  }
}

// ── 加载帖子列表（最新50条，可按 moodKey 筛选）──
export async function loadCommunityPosts(
  moodKey?: string
): Promise<CommunityPost[]> {
  try {
    const db = wx.cloud.database();
    let query = db.collection(COMMUNITY_COLLECTION);
    const condition: Record<string, any> = {};
    if (moodKey) condition.moodKey = moodKey;
    const { data } = await (Object.keys(condition).length > 0
      ? query.where(condition)
      : query
    )
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    return (data as CommunityPost[]) || [];
  } catch (error) {
    return [];
  }
}

// ── 今日活跃人数（按 date 聚合，去重 userId）──
export async function loadTodayActiveCount(): Promise<number> {
  try {
    const db = wx.cloud.database();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const { data } = await db
      .collection(COMMUNITY_COLLECTION)
      .where({ date: todayKey })
      .count();
    // count() 返回 { total: number }
    return (data as any)?.total ?? 0;
  } catch (error) {
    return 0;
  }
}

// ── 给帖子点回应（原子 +1）──
export async function reactToPost(
  postId: string,
  reactionKey: 'candle' | 'hug' | 'sparkle'
): Promise<boolean> {
  try {
    const db = wx.cloud.database();
    const fieldMap = {
      candle:   'reactions.candle',
      hug:      'reactions.hug',
      sparkle:  'reactions.sparkle',
    };
    await db
      .collection(COMMUNITY_COLLECTION)
      .doc(postId)
      .update({
        data: {
          [fieldMap[reactionKey]]: db.command.inc(1),
        },
      });
    return true;
  } catch (error) {
    return false;
  }
}

