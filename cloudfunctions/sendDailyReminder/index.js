const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION = 'subscribeRecords';
const _ = db.command;
const TEMPLATE_ID = 'SaSxE7UpdBSFTE2rI2Jgt4Ujmzz5miL_FuOP3hx0gqw';

// 通过 AppID + AppSecret 获取 access_token
function getAccessToken(appId, appSecret) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error(`获取access_token失败: ${JSON.stringify(result)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 通过 HTTPS 直接调用微信接口发送订阅消息
function sendSubscribeMsg(accessToken, openid, today) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      touser: openid,
      template_id: TEMPLATE_ID,
      page: 'pages/mood/mood',
      miniprogram_state: 'developer', // 上线前改为 formal
      lang: 'zh_CN',
      data: {
        thing3: { value: '该记录今天的心情啦' },
        time7:  { value: `${today} 21:00` },
      }
    });

    const options = {
      hostname: 'api.weixin.qq.com',
      path: `/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.main = async (event, context) => {
  const today = getTodayKey();

  const APP_ID = process.env.APP_ID;
  const APP_SECRET = process.env.APP_SECRET;

  if (!APP_ID || !APP_SECRET) {
    return { success: false, error: 'APP_ID 或 APP_SECRET 未配置' };
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(APP_ID, APP_SECRET);
  } catch (err) {
    return { success: false, error: 'access_token 获取失败' };
  }

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
      const result = await sendSubscribeMsg(accessToken, user.openid, today);

      if (result.errcode === 0) {
        // ✅ 根据 remainingCount 决定更新方式
        let newCount;
        if (user.remainingCount > 7) {
          newCount = 7; // 超过7：收敛到7
        } else {
          newCount = user.remainingCount - 1; // <=7：正常-1
        }

        await db.collection(COLLECTION)
          .doc(user._id)
          .update({
            data: {
              remainingCount: newCount,
              lastSentDate: today,
            }
          });
        sentCount++;

      } else if (result.errcode === 43101) {
        // 用户已取消订阅，清零次数
        await db.collection(COLLECTION)
          .doc(user._id)
          .update({
            data: { remainingCount: 0 }
          });
        errors.push({ openid: user.openid, errCode: result.errcode, errMsg: result.errmsg });
      } else {
        errors.push({ openid: user.openid, errCode: result.errcode, errMsg: result.errmsg });
      }

    } catch (err) {
      errors.push({ openid: user.openid, error: err.message });
    }
  }

  return { success: true, sent: sentCount, errors };
};

// ✅ 修复：使用北京时间 UTC+8，避免云函数 UTC+0 导致日期判断错误
function getTodayKey() {
  const now = new Date();
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return `${bjTime.getUTCFullYear()}-${String(bjTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bjTime.getUTCDate()).padStart(2, '0')}`;
}