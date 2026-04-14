const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION = 'subscribeRecords';
const _ = db.command;

// ✅ 从微信公众平台获取的模板ID，填入这里
const TEMPLATE_ID = 'SaSxE7UpdBSFTE2rI2Jgt4Ujmzz5miL_FuOP3hx0gqw';

exports.main = async (event, context) => {
  const today = getTodayKey();

  // 查询所有有剩余次数、今天还没发过的用户
  const { data: users } = await db.collection(COLLECTION)
    .where({
      remainingCount: _.gt(0),
      lastSentDate: _.neq(today),
    })
    .limit(100)
    .get();

  if (!users || users.length === 0) {
    return { success: true, sent: 0, message: '今日无需发送' };
  }

  let sentCount = 0;
  const errors = [];

  for (const user of users) {
    try {
      // 发送订阅消息
      await cloud.openapi.subscribeMessage.send({
        touser: user.openid,
        page: 'pages/mood/mood',
        templateId: TEMPLATE_ID,
        data: {
          thing3: { value: '该记录今天的心情啦 🌿' },
          time7:  { value: `${today} 21:00` },  // ✅ 晚上9点
        },
        miniprogramState: 'developer', // 开发阶段改为 developer
        lang: 'zh_CN',
      });

      // 发送成功：次数 -1，更新最后发送日期
      await db.collection(COLLECTION)
        .doc(user._id)
        .update({
          data: {
            remainingCount: _.inc(-1),
            lastSentDate: today,
          }
        });

      sentCount++;
    } catch (err) {
      // 43101 = 用户已取消订阅，清零次数，停止继续推送
      if (err.errCode === 43101) {
        await db.collection(COLLECTION)
          .doc(user._id)
          .update({ data: { remainingCount: 0 } });
      }
      errors.push({ openid: user.openid, errCode: err.errCode });
    }
  }

  return { success: true, sent: sentCount, errors };
};

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}