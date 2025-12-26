# 摸鱼网站控制器 🐟⏱️

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-88%2B-brightgreen.svg)
![Edge](https://img.shields.io/badge/Edge-88%2B-blue.svg)

> 基于 Vue 3 + Manifest V3 开发的浏览器扩展，帮助你掌控在"摸鱼网站"上的时间消耗。

**功能亮点：** 设定倒计时、实时显示、自动跳转、每日统计 —— 让你在娱乐和效率之间找到平衡。

## ✨ 功能特性

### 核心功能
- 🎯 **多网站管理** - 添加多个摸鱼网站，独立设置倒计时
- ⏱️ **实时倒计时** - 页面右下角动态显示剩余时间
- 🔄 **自动跳转** - 时间用完后自动重定向到效率网站
- 📊 **数据统计** - 记录每日摸鱼时间和历史总时长
- ⏰ **智能重置** - 每日凌晨 4:00 自动重置摸鱼时间

### 贴心设计
- 🔔 **进站提醒** - 进入摸鱼网站时弹出温馨提示
- ⏳ **灵活延时** - 支持 1/5/10/30/60 分钟快速延长
- 🎨 **美观界面** - 现代化 UI 设计，毛玻璃效果
- 🌐 **多域名支持** - 一次性添加逗号分隔的多个 URL
- 🔐 **本地存储** - 所有数据仅保存在本地，不上传任何信息

### 浏览器支持
- ✅ Chrome 88+（Manifest V3）
- ✅ Microsoft Edge 88+（Chromium 内核）

## 🚀 快速开始

### 安装扩展

#### Chrome 浏览器
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目的 `dist` 目录

#### Edge 浏览器
1. 打开 Edge 浏览器
2. 访问 `edge://extensions/`
3. 开启左下角的 **"开发人员模式"**
4. 点击 **"加载解压缩的扩展"**
5. 选择项目的 `dist` 目录

### 基本使用

1. **设置跳转地址**
   - 右键点击扩展图标 → 选择"选项"
   - 设置"倒计时结束跳转网址"（如：https://notion.so）

2. **添加摸鱼网站**
   - 输入网站名称（如：哔哩哔哩）
   - 输入域名（如：bilibili.com）
   - 设置默认时长（秒，如：600 = 10分钟）

3. **开始使用**
   - 访问添加的摸鱼网站
   - 右下角自动显示倒计时
   - 时间用完后自动跳转

> 💡 **提示：** URL 匹配使用 `includes()` 方法，输入 `bilibili.com` 会匹配所有哔哩哔哩页面。

## 🛠️ 开发指南

### 环境要求
- Node.js 16+
- npm 或 yarn

### 克隆项目
```bash
git clone https://github.com/AnkaAya/distraction-controller.git
cd distraction-controller/distraction-controller-extension
```

### 安装依赖
```bash
npm install
```

### 构建扩展
```bash
npm run build
```

构建完成后，会在 `dist` 目录生成扩展文件。

### 开发模式
```bash
# 开发模式（启用调试日志）
npm run dev

# 修改代码后重新构建
npm run build
```

### 项目结构
```
distraction-controller-extension/
├── public/
│   ├── manifest.json          # 扩展清单文件（Manifest V3）
│   ├── content.css            # 内容脚本样式
│   └── icon*.png              # 扩展图标
├── src/
│   ├── background.js          # 后台服务（Service Worker）
│   ├── content.js             # 内容脚本（页面注入）
│   ├── OptionsApp.vue         # 设置页面主组件
│   ├── options-main.js        # 设置页面入口
│   └── style.css              # 全局样式
├── options.html               # 设置页面 HTML
├── popup.html                 # 弹窗页面 HTML
├── vite.config.js             # Vite 构建配置
├── MANIFEST_GUIDE.md          # Manifest 配置说明
└── package.json               # 项目依赖
```

## 📖 详细使用说明

### 全局设置

#### 1. 跳转地址配置
设置倒计时结束后的跳转目标（建议设置学习/效率工具）：
- Notion 工作区
- Todoist 任务清单
- 在线番茄钟
- 学习资料网站

#### 2. 提醒语设置
自定义进入摸鱼网站时显示的提醒文案，增强自律意识。

**示例：**
```
开始娱乐前先想想自己的目标，坚持完成计划哦～
先完成今天的任务，再决定稍后想娱乐什么
距离目标还有一步之遥，继续加油！
```

### 网站管理

#### 添加摸鱼网站
1. 输入**网站名称**（用于识别，如："哔哩哔哩"）
2. 输入**域名/URL**（支持多个，用逗号分隔）
   ```
   单个：bilibili.com
   多个：bilibili.com, youtube.com, twitter.com
   ```
3. 设置**默认时长**（秒），例如：
   - 600 秒 = 10 分钟
   - 1800 秒 = 30 分钟
   - 3600 秒 = 1 小时

#### 延长倒计时
当前网站卡片中选择延长时长：
- 1 分钟（快速查看）
- 5 分钟（刷几个视频）
- 10 分钟（吃饭时间）
- 30 分钟（午休放松）
- 1 小时（周末娱乐）

#### 数据展示
- **剩余时间** - 当前倒计时
- **今日摸鱼** - 今天在该网站的总时长

## ⚙️ 技术细节

### URL 匹配机制
使用 `String.includes()` 方法进行模糊匹配：

| 配置 | 匹配示例 | 说明 |
|------|---------|------|
| `bilibili.com` | `https://www.bilibili.com/video/BV123` | ✅ 匹配 |
| `bilibili.com` | `https://space.bilibili.com/123456` | ✅ 匹配 |
| `youtube.com` | `https://www.youtube.com/watch?v=abc` | ✅ 匹配 |
| `github.com` | `https://gist.github.com/` | ✅ 匹配（包含子域名） |

### 数据存储
- **位置：** `chrome.storage.local`（浏览器本地存储）
- **持久性：** 关闭浏览器后数据仍保留
- **隐私：** 所有数据仅保存在本地，不上传到任何服务器
- **大小限制：** 最大 5MB（足够存储数千条记录）

### 日期重置逻辑
- **重置时间：** 每日凌晨 **04:00**

## 🔧 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5.24 | 前端框架（设置页面） |
| Vite | 7.2.4 | 构建工具（多入口构建） |
| Manifest V3 | - | Chrome 扩展 API（最新规范） |
| Service Worker | - | 后台服务（替代 Background Page） |
| Chrome Storage API | - | 本地数据持久化 |

### 核心架构
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Content    │◄─────►│  Background │◄─────►│  Options    │
│  Script     │ 消息   │  Service    │ Storage│  Page       │
│ (网页注入)  │       │  (后台服务) │       │ (设置界面)  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                      │
       ▼                     ▼                      ▼
  显示倒计时           全局计时器              管理网站列表
  提醒弹窗            标签页监听               数据统计
  执行跳转            URL匹配检测              延时控制
```

### 关键特性
- ✅ **Manifest V3** 规范（未来兼容）
- ✅ **Service Worker** 后台服务（自动休眠，节省资源）
- ✅ **实时消息通信**（Background ↔ Content Script）
- ✅ **条件编译**（`__DEV__` 变量控制调试日志）
- ✅ **类型安全**（数据格式容错处理）

## ❓ 常见问题

### Q: 多个标签页同时打开同一网站会怎样？
**A:** 只有**当前激活的标签页**会计时，切换标签页会自动切换计时目标。

### Q: 数据会丢失吗？
**A:** 不会。所有数据存储在 `chrome.storage.local`，即使：
- 关闭浏览器 ✅ 数据保留
- 重启电脑 ✅ 数据保留
- 更新扩展 ✅ 数据保留
- 卸载扩展 ❌ 数据清空

### Q: 支持 Firefox 吗？
**A:** 目前仅支持 Chrome 和 Edge（Chromium 内核）。Firefox 需要适配 WebExtensions API。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。

**Copyright (c) 2025 AnkaAya**

您可以自由使用、修改和分发本项目，但需保留原版权声明。详见 [LICENSE](LICENSE) 文件。

## 🙏 鸣谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 官方文档和示例

## 📮 联系方式

- **作者：** AnkaAya
- **问题反馈：** [GitHub Issues](https://github.com/AnkaAya/distraction-controller/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by AnkaAya

</div>
