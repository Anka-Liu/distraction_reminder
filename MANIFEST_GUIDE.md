# Manifest.json 配置说明

## 文件位置
`public/manifest.json`

## 配置项详解

### 基本信息
```json
{
  "manifest_version": 3,     // Manifest V3（最新版Chrome扩展规范）
  "name": "摸鱼时间控制器",    // 扩展名称
  "version": "1.0.0",         // 版本号
  "description": "控制摸鱼网站的访问时间,倒计时结束后自动跳转"
}
```

### 权限配置
```json
{
  "permissions": [
    "storage",    // 用于存储网站列表、倒计时数据、用户设置
    "tabs",       // 用于监听标签页切换和URL变化
    "activeTab",  // 用于获取当前激活标签页的信息
    "scripting"   // 用于在网页中注入内容脚本
  ],

  "host_permissions": [
    "<all_urls>"  // 需要在所有网站上运行，以便检测摸鱼网站并显示倒计时
  ]
}
```

**权限说明：**
- `storage`: 使用 `chrome.storage.local` API 持久化用户数据
- `tabs`: 使用 `chrome.tabs` API 监听标签页事件
- `activeTab`: 获取当前激活标签页的URL和状态
- `scripting`: 动态注入脚本（虽然本项目使用静态注入，但保留以备后用）
- `<all_urls>`: 必须在所有网站运行，因为用户可能添加任何摸鱼网站

### 后台服务
```json
{
  "background": {
    "service_worker": "background.js"  // Manifest V3 后台服务（替代旧版 background page）
  }
}
```

**说明：**
- Manifest V3 使用 Service Worker 替代旧版的持久后台页
- `background.js` 负责全局计时器、标签页监听、数据管理

### 扩展图标和弹窗
```json
{
  "action": {
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    },
    "default_popup": "popup.html"  // 点击扩展图标时弹出的页面
  }
}
```

**图标尺寸：**
- 16x16: 工具栏图标
- 48x48: 扩展管理页面
- 128x128: Chrome 网上应用店

### 设置页面
```json
{
  "options_page": "options.html"  // 设置页面（右键扩展 → 选项）
}
```

### 内容脚本
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],    // 在所有网站上运行
      "js": ["content.js"],          // 内容脚本：显示倒计时、提醒弹窗
      "css": ["content.css"],        // 内容脚本样式
      "run_at": "document_idle"      // 在页面加载完成后注入（性能最优）
    }
  ]
}
```

**注入时机选项：**
- `document_start`: 页面开始加载时（最早）
- `document_end`: DOM构建完成，但资源可能未加载完
- `document_idle`: 页面完全加载后（默认，性能最优）

### 扩展图标
```json
{
  "icons": {
    "16": "icon16.png",   // 扩展管理页面图标
    "48": "icon48.png",   // 扩展详情页图标
    "128": "icon128.png"  // Chrome 网上应用店图标
  }
}
```

## 开发注意事项

### Manifest V3 重要变更
1. **Service Worker 替代 Background Page**
   - 不再支持 `background.page` 和 `background.scripts`
   - 使用 `background.service_worker`
   - Service Worker 会在空闲时自动休眠（节省资源）

2. **权限更细粒度**
   - `host_permissions` 从 `permissions` 中分离
   - 需要明确声明网站访问权限

3. **CSP（内容安全策略）更严格**
   - 不能使用内联脚本和 `eval()`
   - 本项目已符合规范

### 调试技巧
- 修改 manifest.json 后，需要在扩展管理页点击"重新加载"
- 使用 `chrome://extensions/` 查看扩展错误日志
- Service Worker 调试：点击"Service Worker"链接打开开发者工具

## 参考资料
- [Chrome Extension Manifest V3 官方文档](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [从 Manifest V2 迁移到 V3](https://developer.chrome.com/docs/extensions/mv3/mv3-migration/)
