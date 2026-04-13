const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  try {
    const { data } = await db.collection('postReactions')
      .where({ openid: OPENID })
      .get();

    return {
      success: true,
      reactions: data.map(r => ({
        postId: r.postId,
        reactionKey: r.reactionKey,
      })),
    };
  } catch (e) {
    return { success: false, reactions: [] };
  }
};