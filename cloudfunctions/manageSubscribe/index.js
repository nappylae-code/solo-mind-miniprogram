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

    if (data.length > 0) {
      // 已存在记录，次数 +1
      await db.collection(COLLECTION)
        .doc(data[0]._id)
        .update({ data: { remainingCount: _.inc(1) } });
    } else {
      // 首次，新建记录
      await db.collection(COLLECTION).add({
        data: {
          openid,
          remainingCount: 1,
          lastSentDate: '',
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