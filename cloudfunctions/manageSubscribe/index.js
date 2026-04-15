const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION = 'subscribeRecords';
const _ = db.command;

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // ① 累加次数（用户每次打卡时调用）
  if (action === 'increment') {
    const { data } = await db.collection(COLLECTION)
      .where({ openid })
      .get();

    const today = getTodayKey(); // ✅ 使用北京时间

    if (data.length > 0) {
      const record = data[0];

      if (record.lastIncrementDate === today) {
        return { success: true, skipped: true, reason: '今日已累加' };
      }

      await db.collection(COLLECTION)
        .doc(record._id)
        .update({
          data: {
            remainingCount: _.inc(3),
            lastIncrementDate: today,
          }
        });
    } else {
      await db.collection(COLLECTION).add({
        data: {
          openid,
          remainingCount: 3,
          lastSentDate: '',
          lastIncrementDate: today,
        }
      });
    }
    return { success: true };
  }

  // ② 查询剩余次数
  if (action === 'getCount') {
    const { data } = await db.collection(COLLECTION)
      .where({ openid })
      .get();
    const remaining = data.length > 0 ? data[0].remainingCount : 0;
    return { success: true, remainingCount: remaining };
  }

  return { success: false, error: 'Unknown action' };
};

// ✅ 修复：使用北京时间 UTC+8，避免云函数 UTC+0 导致日期判断错误
function getTodayKey() {
  const now = new Date();
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return `${bjTime.getUTCFullYear()}-${String(bjTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bjTime.getUTCDate()).padStart(2, '0')}`;
}