// utils/cloudDB.ts
// ============================================
// Cloud Database utility
// moodEntries: 情绪打卡（note 加密存储）
// diaryEntries: 日记（content 加密存储）
// ============================================
import { encryptField, decryptField, hashUserId, encryptPublicField, decryptPublicField } from './encryption';

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
    const encryptedNote = entry.note ? encryptField(entry.note) : '';

    // ✅ 查询和存储都用哈希后的 userId
    const hashedUserId = hashUserId(entry.userId);

    const { data } = await db
      .collection(MOOD_COLLECTION)
      .where({ userId: hashedUserId, date: entry.date })
      .get();

    if (data && data.length > 0) {
      await db
        .collection(MOOD_COLLECTION)
        .doc(data[0]._id)
        .update({
          data: {
            moodKey: entry.moodKey,
            encryptedNote: encryptedNote,
            timestamp: entry.timestamp,
            note: db.command.remove(),
          },
        });
    } else {
      await db.collection(MOOD_COLLECTION).add({
        data: {
          userId: hashedUserId,  // ✅ 存哈希值
          date: entry.date,
          moodKey: entry.moodKey,
          encryptedNote: encryptedNote,
          timestamp: entry.timestamp,
        },
      });
    }

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
): Promise<Record<string, { timestamp: number; moodKey: string; note?: string }>> {
  try {
    const db = wx.cloud.database();

    // ✅ 查询用哈希后的 userId
    const hashedUserId = hashUserId(userId);

    const { data } = await db
      .collection(MOOD_COLLECTION)
      .where({ userId: hashedUserId })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const entries: Record<string, { timestamp: number; moodKey: string; note?: string }> = {};

    if (data && data.length > 0) {
      for (const item of data) {
        let note = '';
        if (item.encryptedNote) {
          note = decryptField(item.encryptedNote) ?? '';
        } else if (item.note) {
          note = item.note;
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
    const encryptedContent = entry.content ? encryptField(entry.content) : '';

    // ✅ 查询和存储都用哈希后的 userId
    const hashedUserId = hashUserId(entry.userId);

    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId: hashedUserId, date: entry.date })
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
          userId: hashedUserId,  // ✅ 存哈希值
          date: entry.date,
          encryptedContent: encryptedContent,
          moodKey: entry.moodKey || '',
          timestamp: entry.timestamp,
        },
      });
    }

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
): Promise<Record<string, { timestamp: number; content?: string; moodKey?: string }>> {
  try {
    const db = wx.cloud.database();

    // ✅ 查询用哈希后的 userId
    const hashedUserId = hashUserId(userId);

    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId: hashedUserId })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const entries: Record<string, { timestamp: number; content?: string; moodKey?: string }> = {};

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

    // ✅ 查询用哈希后的 userId
    const hashedUserId = hashUserId(userId);

    const { data } = await db
      .collection(DIARY_COLLECTION)
      .where({ userId: hashedUserId, date })
      .get();

    if (data && data.length > 0) {
      await db.collection(DIARY_COLLECTION).doc(data[0]._id).remove();
    }

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
// content 字段加密存储，与 moodEntries/diaryEntries 保持一致
// ============================================
const COMMUNITY_COLLECTION = 'communityPosts';

// 云端存储结构（content 加密，对后台不可读）
export interface CommunityPost {
  _id?: string;
  userId: string;             // hash 后的匿名 ID
  moodKey: string;            // 明文（枚举值，无隐私）
  encryptedContent: string;   // ✅ 加密存储
  timestamp: number;
  date: string;               // YYYY-MM-DD
  reactions: {
    candle: number;           // 🕯️ 我懂
    hug: number;              // 🤗 加油
    sparkle: number;          // ✨ 真棒
  };
}

// 页面展示用（解密后）
export interface CommunityPostDecrypted extends Omit<CommunityPost, 'encryptedContent'> {
  content: string;            // ✅ 解密后的明文，仅在内存中使用
}

// ── 发布匿名帖子（加密 content 后存入云端）──
export async function publishCommunityPost(
  userId: string,
  moodKey: string,
  content: string,
  date: string
): Promise<boolean> {
  try {
    const db = wx.cloud.database();

    // ✅ 广场用固定密钥加密，所有用户都能解密
    const encryptedContent = encryptPublicField(content);
    const hashedUserId = hashUserId(userId);

    await db.collection(COMMUNITY_COLLECTION).add({
      data: {
        userId: hashedUserId,
        moodKey,
        encryptedContent,
        timestamp: Date.now(),
        date,
        reactions: { candle: 0, hug: 0, sparkle: 0 },
      },
    });

    return true;
  } catch (error) {
    return false;
  }
}

// ── 加载帖子列表（读取后解密 content）──
export async function loadCommunityPosts(
  moodKey?: string
): Promise<CommunityPostDecrypted[]> {
  try {
    const db = wx.cloud.database();
    const collection = db.collection(COMMUNITY_COLLECTION);
    const query = moodKey ? collection.where({ moodKey }) : collection;

    const { data } = await query
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    if (!data || data.length === 0) return [];

    const results: CommunityPostDecrypted[] = [];
    for (const item of data) {
      let content = '';
      if (item.encryptedContent) {
        // ✅ 用固定密钥解密，所有用户都能读取
        content = decryptPublicField(item.encryptedContent) ?? '';
      } else if (item.content) {
        content = item.content; // 兼容旧明文数据
      }

      if (!content) continue;

      results.push({
        _id:       item._id,
        userId:    item.userId,
        moodKey:   item.moodKey,
        content,
        timestamp: item.timestamp,
        date:      item.date,
        reactions: item.reactions ?? { candle: 0, hug: 0, sparkle: 0 },
      });
    }

    return results;
  } catch (error) {
    return [];
  }
}

// ── 今日活跃人数 ──
export async function loadTodayActiveCount(): Promise<number> {
  try {
    const db = wx.cloud.database();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const res = await db
      .collection(COMMUNITY_COLLECTION)
      .where({ date: todayKey })
      .count();
    return res.total ?? 0;
  } catch (error) {
    return 0;
  }
}

// ── 预设回应（通过云函数执行，绕过权限限制）──
export async function reactToPost(
  postId: string,
  reactionKey: 'candle' | 'hug' | 'sparkle'
): Promise<{ success: boolean; action?: 'added' | 'removed' }> {
  try {
    const result = await wx.cloud.callFunction({
      name: 'reactToPost',
      data: { postId, reactionKey },
    });
    const res = result.result as any;
    return {
      success: res.success === true,
      action: res.action,
    };
  } catch (error) {
    return { success: false };
  }
}

// ── 加载当前用户的点击记录 ──
export async function loadMyReactions(
  openid: string
): Promise<Record<string, Record<string, boolean>>> {
  try {
    const db = wx.cloud.database();
    const hashedOpenid = hashUserId(openid);

    // ⚠️ postReactions 存的是原始 openid（由云函数写入）
    // 云函数用的是微信原生 OPENID，不是哈希值
    // 所以这里直接用云函数来查询
    const result = await wx.cloud.callFunction({
      name: 'getMyReactions',
    });

    const reactions = (result.result as any).reactions as Array<{
      postId: string;
      reactionKey: string;
    }>;

    const reactedMap: Record<string, Record<string, boolean>> = {};
    for (const r of reactions) {
      if (!reactedMap[r.postId]) reactedMap[r.postId] = {};
      reactedMap[r.postId][r.reactionKey] = true;
    }

    return reactedMap;
  } catch {
    return {};
  }
}

