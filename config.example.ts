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

  // AES 加密密钥
  // 建议使用 32 位以上的随机字符串
  AES_SECRET_KEY: 'YOUR_AES_SECRET_KEY',
};

export default config;