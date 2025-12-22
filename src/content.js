// content.js - 在摸鱼网站页面上显示倒计时
let countdownOverlay = null
let countdownInterval = null
let currentSiteId = null

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

// 检查当前URL是否匹配摸鱼网站
async function checkCurrentUrl() {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    if (__DEV__) console.warn('[content.js] 扩展上下文已失效，停止执行')
    removeCountdownOverlay()
    return
  }

  const currentUrl = window.location.href

  try {
    const result = await safeStorageGet(['websites'])

    // 如果返回 null，说明扩展上下文已失效
    if (result === null) {
      if (__DEV__) console.warn('[content.js] 扩展上下文已失效，需要刷新页面')
      removeCountdownOverlay()
      return
    }

    const websites = normalizeWebsites(result.websites)

    // 查找匹配的网站
    const matchedSite = websites.find(site =>
      site.enabled && currentUrl.includes(site.url)
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
