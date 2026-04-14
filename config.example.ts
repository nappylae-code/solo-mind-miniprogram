// config.example.ts
// ============================================
// 本文件是配置模板，不包含真实值
// 使用步骤：
// 1. 复制本文件，重命名为 config.ts
// 2. 将占位符替换为你的真实值
// 3. config.ts 已被 .gitignore 忽略，不会被提交
// ============================================

const config = {
  // 微信云开发环境 ID
  // 在微信开发者工具 → 云开发控制台 中查看
  CLOUD_ENV_ID: 'YOUR_CLOUD_ENV_ID',

  // ✅ 新增：订阅消息模板 ID
  // 在微信公众平台 → 功能 → 订阅消息 → 我的模板 中查看
  SUBSCRIBE_TEMPLATE_ID: 'YOUR_SUBSCRIBE_TEMPLATE_ID',

  APP_ID: 'YOUR_APP_ID',
  APP_SECRET: 'YOUR_APP_SECRET',
};

export default config;