const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { postId, reactionKey } = event;
  const { OPENID } = cloud.getWXContext();

  // 验证 reactionKey 合法性
  const validKeys = ['candle', 'hug', 'sparkle'];
  if (!validKeys.includes(reactionKey)) {
    return { success: false, error: 'Invalid reaction key' };
  }

  const db = cloud.database();

  // ✅ 检查是否已经点击过
  const existing = await db.collection('postReactions')
    .where({
      postId,
      openid: OPENID,
    })
    .get();

  if (existing.data && existing.data.length > 0) {
    return { success: false, error: 'already_reacted' };
  }

  // ✅ 记录点击
  await db.collection('postReactions').add({
    data: {
      postId,
      openid: OPENID,
      reactionKey,
      timestamp: Date.now(),
    },
  });

  // ✅ 更新帖子的反应数
  const fieldMap = {
    candle:  'reactions.candle',
    hug:     'reactions.hug',
    sparkle: 'reactions.sparkle',
  };

  await db.collection('communityPosts')
    .doc(postId)
    .update({
      data: {
        [fieldMap[reactionKey]]: db.command.inc(1),
      },
    });

  return { success: true };
};