declare const wx: any;

// ============================================
// Cloud Database Collection Name
// ============================================
const COLLECTION_NAME = 'moodEntries';

// ============================================
// Interfaces
// ============================================
export interface CloudMoodEntry {
  _id?: string;
  userId: string;
  date: string;
  moodKey: string;
  note: string;
  timestamp: number;
}

// ============================================
// Save or Update mood entry for a specific date
// If entry exists for that date → update it
// If not → create new one
// ============================================
export async function saveMoodToCloud(entry: CloudMoodEntry): Promise<boolean> {
  try {
    const db = wx.cloud.database();

    // Check if entry already exists for this date
    const { data } = await db.collection(COLLECTION_NAME)
      .where({
        userId: entry.userId,
        date: entry.date
      })
      .get();

    if (data && data.length > 0) {
      // Update existing entry
      await db.collection(COLLECTION_NAME)
        .doc(data[0]._id)
        .update({
          data: {
            moodKey: entry.moodKey,
            note: entry.note,
            timestamp: entry.timestamp
          }
        });
    } else {
      // Add new entry
      await db.collection(COLLECTION_NAME).add({
        data: {
          userId: entry.userId,
          date: entry.date,
          moodKey: entry.moodKey,
          note: entry.note,
          timestamp: entry.timestamp
        }
      });
    }

    // Update local cache after successful cloud save
    try {
      const cached = wx.getStorageSync(LOCAL_CACHE_KEY);
      const entries = cached ? JSON.parse(cached) : {};
      entries[entry.date] = {
        timestamp: entry.timestamp,
        moodKey: entry.moodKey,
        note: entry.note || undefined
      };
      wx.setStorageSync(LOCAL_CACHE_KEY, JSON.stringify(entries));
    } catch (e) {
      // ignore cache update error
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// Get all mood entries for a user
// Returns entries as a Record<date, entry> map
// ============================================
const LOCAL_CACHE_KEY = 'moodEntriesCache';

export async function loadMoodFromCloud(
  userId: string
): Promise<Record<string, { timestamp: number; moodKey: string; note?: string }>> {
  try {
    const db = wx.cloud.database();
    const { data } = await db.collection(COLLECTION_NAME)
      .where({ userId })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const entries: Record<string, { timestamp: number; moodKey: string; note?: string }> = {};
    if (data && data.length > 0) {
      for (const item of data) {
        entries[item.date] = {
          timestamp: item.timestamp,
          moodKey: item.moodKey,
          note: item.note || undefined
        };
      }
    }

    // Cache the latest cloud data locally for offline use
    wx.setStorageSync(LOCAL_CACHE_KEY, JSON.stringify(entries));
    return entries;

  } catch (error) {
    // Cloud unavailable — try local cache as fallback
    try {
      const cached = wx.getStorageSync(LOCAL_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore cache error
    }
    return {};
  }
}