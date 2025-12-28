/**
 * CRX 打包脚本
 *
 * 用途：将构建后的 dist 目录打包成 .crx 文件
 *
 * 使用方法：
 * 1. npm run build        # 先构建项目
 * 2. npm run pack         # 打包成 .crx 文件
 *
 * 输出：
 * - distraction-controller-v{version}.crx  # Chrome 扩展安装包（包含版本号）
 * - distraction-controller-v{version}.zip  # ZIP 格式（包含版本号）
 * - distraction-controller.pem             # 私钥文件（首次生成，需妥善保管）
 */

import crx3 from 'crx3';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildCRX() {
  console.log('🚀 开始打包 CRX 文件...\n');

  // 读取 manifest.json 获取版本号
  const manifestPath = resolve(__dirname, 'public/manifest.json');
  let version = '1.0.0';
  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    version = manifest.version || '1.0.0';
    console.log(`📌 当前版本：${version}\n`);
  } catch (error) {
    console.warn('⚠️  无法读取 manifest.json，使用默认版本号 1.0.0\n');
  }

  // 配置路径（文件名包含版本号）
  const distDir = resolve(__dirname, 'dist');
  const crxPath = resolve(__dirname, `distraction-controller-v${version}.crx`);
  const pemPath = resolve(__dirname, 'distraction-controller.pem');

  // 检查 dist 目录是否存在
  if (!existsSync(distDir)) {
    console.error('❌ 错误：dist 目录不存在！');
    console.log('💡 请先运行 npm run build 构建项目\n');
    process.exit(1);
  }

  try {
    // 使用 crx3 打包
    const result = await crx3([distDir], {
      keyPath: pemPath,      // 私钥路径
      crxPath: crxPath,      // 输出 .crx 文件路径
      zipPath: resolve(__dirname, `distraction-controller-v${version}.zip`) // 可选：同时输出 zip
    });

    // 检查是否生成了新的私钥
    if (result.newKey) {
      console.log('🔑 已生成新的私钥文件：distraction-controller.pem');
      console.log('⚠️  请妥善保管私钥文件，更新扩展时需要使用相同的私钥！\n');
    } else {
      console.log('🔑 使用现有私钥文件\n');
    }

    console.log('✅ CRX 文件打包成功！');
    console.log(`📦 输出文件：${crxPath}`);
    console.log(`📦 ZIP 文件：${resolve(__dirname, `distraction-controller-v${version}.zip`)}`);
    console.log(`🆔 扩展 ID：${result.appId}\n`);
    console.log('📖 使用说明：');
    console.log('1. 打开 Chrome 浏览器');
    console.log('2. 访问 chrome://extensions/');
    console.log('3. 开启"开发者模式"');
    console.log('4. 将 .crx 文件拖拽到页面中即可安装\n');

  } catch (error) {
    console.error('❌ 打包失败：', error.message);
    console.error(error);
    process.exit(1);
  }
}

buildCRX();
