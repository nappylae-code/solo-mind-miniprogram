const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { postId, reactionKey } = event;

  // 只允许更新 reactions 字段，不允许修改其他内容
  const validKeys = ['candle', 'hug', 'sparkle'];
  if (!validKeys.includes(reactionKey)) {
    return { success: false, error: 'Invalid reaction key' };
  }

  const db = cloud.database();
  const fieldMap = {
    candle:  'reactions.candle',
    hug:     'reactions.hug',
    sparkle: 'reactions.sparkle',
  };

  try {
    await db.collection('communityPosts')
      .doc(postId)
      .update({
        data: {
          [fieldMap[reactionKey]]: db.command.inc(1),
        },
      });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};