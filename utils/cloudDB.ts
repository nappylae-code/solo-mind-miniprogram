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
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// Get all mood entries for a user
// Returns entries as a Record<date, entry> map
// ============================================
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
    return entries;
  } catch (error) {
    return {};
  }
}