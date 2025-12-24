// content.js - 在摸鱼网站页面上显示倒计时
let countdownOverlay = null
let countdownInterval = null
let currentSiteId = null
let reminderOverlay = null
let reminderCloseTimeout = null
const DEFAULT_REMINDER_MESSAGE = '开始娱乐前先想想自己的目标，坚持完成计划哦～'

// 检查扩展上下文是否有效
function isExtensionContextValid() {
  try {
    return !!(chrome.runtime && chrome.runtime.id)
  } catch (error) {
    return false
  }
}

// 安全地从 storage 读取数据
async function safeStorageGet(keys) {
  if (!isExtensionContextValid()) {
    return null
  }

  try {
    return await chrome.storage.local.get(keys)
  } catch (error) {
    // 静默处理扩展上下文失效的错误
    if (error.message && error.message.includes('Extension context invalidated')) {
      return null
    }
    throw error
  }
}

// 辅助函数：从 storage 读取 websites 并正确处理类型
function normalizeWebsites(storageWebsites) {
  if (Array.isArray(storageWebsites)) {
    return storageWebsites
  } else if (storageWebsites && typeof storageWebsites === 'object') {
    // 如果是对象（例如被错误保存为 {0: {...}, 1: {...}}），转换为数组
    if (__DEV__) console.warn('[content.js normalizeWebsites] ⚠️ websites被存储为对象，转换为数组')
    return Object.values(storageWebsites)
  }
  return []
}

// 辅助函数：检查URL是否匹配网站的任一域名
function matchesAnyUrl(tabUrl, siteUrlString) {
  // 支持逗号、分号、空格分隔的多个URL
  const urls = siteUrlString.split(/[,;，；\s]+/).map(u => u.trim()).filter(u => u)
  return urls.some(url => tabUrl.includes(url))
}

// 创建倒计时覆盖层
function createCountdownOverlay() {
  if (countdownOverlay) return

  countdownOverlay = document.createElement('div')
  countdownOverlay.id = 'distraction-countdown-overlay'
  countdownOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 24px;
    font-weight: bold;
    z-index: 999999;
    font-family: Arial, monospace;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 150px;
    text-align: center;
  `
  document.body.appendChild(countdownOverlay)
}

// 更新倒计时显示
function updateCountdownDisplay(seconds) {
  if (!countdownOverlay) {
    createCountdownOverlay()
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  countdownOverlay.textContent = timeString

  // 时间快结束时变红
  if (seconds <= 60) {
    countdownOverlay.style.background = 'rgba(220, 53, 69, 0.9)'
  } else if (seconds <= 300) {
    countdownOverlay.style.background = 'rgba(255, 152, 0, 0.9)'
  } else {
    countdownOverlay.style.background = 'rgba(0, 0, 0, 0.85)'
  }
}

// 移除倒计时覆盖层
function removeCountdownOverlay() {
  if (countdownOverlay) {
    countdownOverlay.remove()
    countdownOverlay = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// 提醒弹窗样式
function ensureReminderStyles() {
  if (document.getElementById('dc-reminder-style')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'dc-reminder-style'
  style.textContent = `
    #distraction-reminder-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(6px);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: dcReminderBackdropFade 0.25s ease-out;
    }

    .dc-reminder-card {
      width: min(440px, calc(100% - 40px));
      border-radius: 28px;
      background: linear-gradient(135deg, #eef2ff 0%, #ffffff 40%, #ecfeff 100%);
      box-shadow: 0 35px 60px rgba(15, 23, 42, 0.35);
      padding: 32px;
      position: relative;
      overflow: hidden;
      animation: dcReminderCardEnter 0.35s ease;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
    }

    .dc-reminder-card::before {
      content: '';
      position: absolute;
      inset: 18px;
      border-radius: 24px;
      border: 1px solid rgba(99, 102, 241, 0.15);
      pointer-events: none;
    }

    .dc-reminder-close {
      position: absolute;
      top: 18px;
      right: 18px;
      background: rgba(15, 23, 42, 0.08);
      border: none;
      border-radius: 999px;
      width: 32px;
      height: 32px;
      color: #0f172a;
      font-size: 18px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .dc-reminder-close:hover {
      background: rgba(15, 23, 42, 0.2);
      transform: translateY(-1px);
    }

    .dc-reminder-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      color: #2563eb;
      background: rgba(37, 99, 235, 0.12);
      font-size: 13px;
      font-weight: 600;
    }

    .dc-reminder-title {
      font-size: 1.5rem;
      margin: 16px 0 8px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .dc-reminder-message {
      font-size: 1rem;
      line-height: 1.6;
      color: #475569;
      margin: 0;
      white-space: pre-wrap;
    }

    .dc-reminder-highlight {
      display: block;
      margin: 18px 0 0;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .dc-reminder-actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .dc-reminder-actions button {
      border: none;
      border-radius: 16px;
      padding: 12px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .dc-reminder-actions .dc-primary {
      background: linear-gradient(120deg, #4f46e5, #2563eb);
      color: #fff;
      box-shadow: 0 15px 45px rgba(37, 99, 235, 0.4);
    }

    .dc-reminder-actions .dc-secondary {
      background: rgba(15, 23, 42, 0.05);
      color: #0f172a;
      border: 1px solid rgba(15, 23, 42, 0.15);
    }

    @keyframes dcReminderBackdropFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes dcReminderCardEnter {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `
  document.head.appendChild(style)
}

function hideReminderOverlay() {
  if (reminderOverlay) {
    reminderOverlay.remove()
    reminderOverlay = null
  }
  if (reminderCloseTimeout) {
    clearTimeout(reminderCloseTimeout)
    reminderCloseTimeout = null
  }
}

function showReminderOverlay(message, siteName) {
  ensureReminderStyles()
  hideReminderOverlay()

  const overlay = document.createElement('div')
  overlay.id = 'distraction-reminder-overlay'

  const card = document.createElement('div')
  card.className = 'dc-reminder-card'

  const closeButton = document.createElement('button')
  closeButton.className = 'dc-reminder-close'
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', '关闭提醒')
  closeButton.textContent = '×'
  closeButton.addEventListener('click', hideReminderOverlay)

  const badge = document.createElement('span')
  badge.className = 'dc-reminder-tag'
  badge.textContent = '专注提示'

  const title = document.createElement('h2')
  title.className = 'dc-reminder-title'
  title.textContent = siteName ? `准备进入 ${siteName}` : '准备进入摸鱼网站'

  const messageEl = document.createElement('p')
  messageEl.className = 'dc-reminder-message'
  messageEl.textContent = message

  const hint = document.createElement('span')
  hint.className = 'dc-reminder-highlight'
  hint.textContent = '站在未来的自己角度，看看现在的决定是否值得？'

  const actions = document.createElement('div')
  actions.className = 'dc-reminder-actions'

  const primaryBtn = document.createElement('button')
  primaryBtn.className = 'dc-primary'
  primaryBtn.type = 'button'
  primaryBtn.textContent = '坚持计划，返回任务'
  primaryBtn.addEventListener('click', () => {
    hideReminderOverlay()
    // 请求跳转到设置的跳转页面
    chrome.runtime.sendMessage({
      type: 'REDIRECT_FROM_REMINDER'
    })
  })

  const secondaryBtn = document.createElement('button')
  secondaryBtn.className = 'dc-secondary'
  secondaryBtn.type = 'button'
  secondaryBtn.textContent = '我知道了'
  secondaryBtn.addEventListener('click', hideReminderOverlay)

  actions.appendChild(primaryBtn)
  actions.appendChild(secondaryBtn)

  card.appendChild(closeButton)
  card.appendChild(badge)
  card.appendChild(title)
  card.appendChild(messageEl)
  card.appendChild(hint)
  card.appendChild(actions)

  overlay.appendChild(card)

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      hideReminderOverlay()
    }
  })

  reminderOverlay = overlay

  const appendOverlay = () => {
    if (!document.body) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          if (reminderOverlay) {
            document.body.appendChild(reminderOverlay)
          }
        },
        { once: true }
      )
    } else {
      document.body.appendChild(reminderOverlay)
    }
  }

  appendOverlay()

  reminderCloseTimeout = setTimeout(() => {
    hideReminderOverlay()
  }, 10000)
}

// 检查当前URL是否匹配摸鱼网站
async function checkCurrentUrl() {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    if (__DEV__) console.warn('[content.js] 扩展上下文已失效，停止执行')
    removeCountdownOverlay()
    hideReminderOverlay()
    return
  }

  const currentUrl = window.location.href

  try {
    const result = await safeStorageGet(['websites'])

    // 如果返回 null，说明扩展上下文已失效
    if (result === null) {
      if (__DEV__) console.warn('[content.js] 扩展上下文已失效，需要刷新页面')
      removeCountdownOverlay()
      hideReminderOverlay()
      return
    }

    const websites = normalizeWebsites(result.websites)

    // 查找匹配的网站
    const matchedSite = websites.find(site =>
      site.enabled && matchesAnyUrl(currentUrl, site.url)
    )

    if (matchedSite) {
      currentSiteId = matchedSite.id

      // 再次检查上下文（在异步操作后）
      if (!isExtensionContextValid()) {
        if (__DEV__) console.warn('[content.js] 发送消息前上下文已失效')
        removeCountdownOverlay()
        return
      }

      // 通知 background script 开始计时
      chrome.runtime.sendMessage({
        type: 'START_TRACKING',
        siteId: matchedSite.id,
        url: currentUrl
      }, () => {
        // 检查是否有运行时错误
        if (chrome.runtime.lastError) {
          if (__DEV__) console.warn('[content.js] 发送消息失败:', chrome.runtime.lastError.message)
          removeCountdownOverlay()
        }
      })

      // 显示倒计时
      updateCountdownDisplay(matchedSite.remainingTime)
    } else {
      // 不是摸鱼网站，移除倒计时
      removeCountdownOverlay()
      hideReminderOverlay()
      currentSiteId = null
    }
  } catch (error) {
    // 只记录非预期的错误
    console.error('[content.js] 检查URL失败:', error)
  }
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 检查扩展上下文
  if (!isExtensionContextValid()) {
    if (__DEV__) console.warn('[content.js] 接收消息时上下文已失效')
    return
  }

  try {
    if (message.type === 'UPDATE_COUNTDOWN') {
      if (message.siteId === currentSiteId) {
        updateCountdownDisplay(message.remainingTime)
      }
    } else if (message.type === 'SHOW_REMINDER') {
      const messageText =
        typeof message.message === 'string' && message.message.trim().length > 0
          ? message.message
          : DEFAULT_REMINDER_MESSAGE
      showReminderOverlay(messageText, message.siteName)
    } else if (message.type === 'REDIRECT') {
      // 倒计时结束，准备跳转
      window.location.href = message.url
    }
  } catch (error) {
    console.error('[content.js] 处理消息失败:', error)
  }
})

// 页面加载时检查
checkCurrentUrl()

// 监听URL变化 (SPA应用)
let lastUrl = location.href
new MutationObserver(() => {
  const currentUrl = location.href
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl
    checkCurrentUrl()
  }
}).observe(document, { subtree: true, childList: true })
