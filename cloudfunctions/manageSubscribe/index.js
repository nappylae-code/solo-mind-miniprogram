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

    const today = getTodayKey(); // ✅ 新增

    if (data.length > 0) {
      const record = data[0];

      // ✅ 同一天已经累加过了，不重复累加
      if (record.lastIncrementDate === today) {
        return { success: true, skipped: true, reason: '今日已累加' };
      }

      // 不同天才累加
      await db.collection(COLLECTION)
        .doc(record._id)
        .update({
          data: {
            remainingCount: _.inc(1),
            lastIncrementDate: today, // ✅ 记录最后累加日期
          }
        });
    } else {
      // 首次，新建记录
      await db.collection(COLLECTION).add({
        data: {
          openid,
          remainingCount: 1,
          lastSentDate: '',
          lastIncrementDate: today, // ✅ 新增字段
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

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}