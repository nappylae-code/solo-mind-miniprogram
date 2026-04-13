const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { postId, reactionKey } = event;
  const { OPENID } = cloud.getWXContext();

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

  // ✅ 查询时同时匹配 postId + openid + reactionKey
  // 每个反应独立记录，互不影响
  const existing = await db.collection('postReactions')
    .where({
      postId,
      openid: OPENID,
      reactionKey,  // ✅ 加上这个条件
    })
    .get();

  if (existing.data && existing.data.length > 0) {
    // 已点击过这个反应 → 取消，-1
    await db.collection('postReactions')
      .doc(existing.data[0]._id)
      .remove();

    await db.collection('communityPosts')
      .doc(postId)
      .update({
        data: {
          [fieldMap[reactionKey]]: db.command.inc(-1),
        },
      });

    return { success: true, action: 'removed' };

  } else {
    // 未点击过这个反应 → 新增，+1
    await db.collection('postReactions').add({
      data: {
        postId,
        openid: OPENID,
        reactionKey,  // ✅ 记录具体是哪个反应
        timestamp: Date.now(),
      },
    });

    await db.collection('communityPosts')
      .doc(postId)
      .update({
        data: {
          [fieldMap[reactionKey]]: db.command.inc(1),
        },
      });

    return { success: true, action: 'added' };
  }
};