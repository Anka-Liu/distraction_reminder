// background.js - 后台服务，监控标签页和管理计时器
let trackingData = {} // 存储每个网站的跟踪信息
let activeTabId = null
const DEFAULT_REMINDER_MESSAGE = '开始娱乐前先想想自己的目标，坚持完成计划哦～'
const tabFocusState = {}

// 辅助函数：获取当前日期标识（以4点为界）
function getDateKey(date = new Date()) {
  const hours = date.getHours()
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // 如果当前时间 < 4点，则属于前一天
  if (hours < 4) {
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  }

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 安全地从 storage 读取数据
async function safeStorageGet(keys) {
  try {
    return await chrome.storage.local.get(keys)
  } catch (error) {
    // 静默处理扩展上下文失效的错误
    if (error.message && error.message.includes('Extension context invalidated')) {
      if (__DEV__) console.warn('[background.js] 扩展上下文已失效')
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
    if (__DEV__) console.warn('[normalizeWebsites] ⚠️ websites被存储为对象，转换为数组')
    return Object.values(storageWebsites)
  }
  return []
}

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('摸鱼控制器已安装')
  initializeDefaultSettings()
})

// 设置默认配置
async function initializeDefaultSettings() {
  const result = await safeStorageGet(['redirectUrl', 'websites', 'reminderMessage'])

  if (!result) return // 扩展上下文失效

  if (!result.redirectUrl) {
    await chrome.storage.local.set({
      redirectUrl: 'https://www.google.com'
    })
  }

  if (!result.websites) {
    await chrome.storage.local.set({
      websites: []
    })
  }

  if (result.reminderMessage === undefined) {
    await chrome.storage.local.set({
      reminderMessage: DEFAULT_REMINDER_MESSAGE
    })
  }
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACKING') {
    startTracking(message.siteId, sender.tab.id, message.url)
  } else if (message.type === 'UPDATE_TIMER') {
    updateSiteTimer(message.siteId, message.remainingTime)
  } else if (message.type === 'REDIRECT_FROM_REMINDER') {
    // 用户点击"坚持计划，返回任务"按钮，跳转到设置的跳转页面
    handleReminderRedirect(sender.tab.id)
  }
})

// 处理从提醒弹窗发起的跳转
async function handleReminderRedirect(tabId) {
  try {
    const result = await safeStorageGet(['redirectUrl'])

    if (!result) {
      if (__DEV__) console.warn('[handleReminderRedirect] 扩展上下文已失效')
      return
    }

    const redirectUrl = result.redirectUrl || 'https://www.google.com'

    // 停止该标签页相关的所有跟踪
    for (const siteId in trackingData) {
      if (trackingData[siteId].tabId === tabId) {
        stopTracking(siteId)
      }
    }

    // 执行跳转
    await chrome.tabs.update(tabId, { url: redirectUrl })
    console.log('[handleReminderRedirect] 跳转成功:', redirectUrl)
  } catch (error) {
    console.error('[handleReminderRedirect] 跳转失败:', error)
  }
}

// 开始跟踪网站
async function startTracking(siteId, tabId, url) {
  console.log('开始跟踪网站:', siteId, tabId)

  // 如果已经在跟踪，先停止
  if (trackingData[siteId]) {
    stopTracking(siteId)
  }

  // 检查当前网站的剩余时间
  try {
    const result = await safeStorageGet(['websites', 'redirectUrl'])

    if (!result) {
      if (__DEV__) console.warn('[startTracking] 扩展上下文已失效')
      return
    }

    const websites = normalizeWebsites(result.websites)
    const redirectUrl = result.redirectUrl || 'https://www.google.com'

    const site = websites.find(s => s.id === siteId)

    if (site && site.remainingTime <= 0) {
      // 时间已经用完，立即跳转
      console.log('网站时间已用完，立即跳转:', site.name)
      try {
        await chrome.tabs.update(tabId, { url: redirectUrl })
        console.log('直接跳转成功:', redirectUrl)
      } catch (error) {
        console.error('跳转失败:', error)
      }
      return // 不创建跟踪记录
    }
  } catch (error) {
    console.error('检查剩余时间失败:', error)
  }

  // 创建新的跟踪记录
  trackingData[siteId] = {
    tabId: tabId,
    url: url,
    interval: setInterval(() => {
      updateTimer(siteId)
    }, 1000)
  }
}

// 停止跟踪网站
function stopTracking(siteId) {
  if (trackingData[siteId]) {
    clearInterval(trackingData[siteId].interval)
    delete trackingData[siteId]
  }
}

// 更新计时器
async function updateTimer(siteId) {
  try {
    // 检查该网站的tab是否是当前激活的tab
    if (!trackingData[siteId]) {
      return
    }

    const tabId = trackingData[siteId].tabId

    // 只有当该tab是active状态时才进行倒计时
    if (tabId !== activeTabId) {
      console.log('[updateTimer] Tab未激活，跳过倒计时:', siteId, 'tabId:', tabId, 'activeTabId:', activeTabId)
      return
    }

    const result = await safeStorageGet(['websites', 'redirectUrl'])

    if (!result) {
      if (__DEV__) console.warn('[updateTimer] 扩展上下文已失效')
      stopTracking(siteId)
      return
    }

    const websites = normalizeWebsites(result.websites)
    const redirectUrl = result.redirectUrl || 'https://www.google.com'

    const siteIndex = websites.findIndex(site => site.id === siteId)
    if (siteIndex === -1) {
      stopTracking(siteId)
      return
    }

    const site = websites[siteIndex]

    // 检查是否需要重置每日摸鱼时间（以4点为界）
    const currentDateKey = getDateKey()
    if (!site.lastResetDate || site.lastResetDate !== currentDateKey) {
      site.dailyTotalTime = 0
      site.lastResetDate = currentDateKey
      console.log(`[updateTimer] 重置每日摸鱼时间: ${site.name}, 日期: ${currentDateKey}`)
    }

    // 减少剩余时间
    if (site.remainingTime > 0) {
      site.remainingTime--
      site.totalTime++ // 历史累计总时间
      site.dailyTotalTime++ // 今日摸鱼时间

      // 保存更新
      await chrome.storage.local.set({ websites })

      // 通知 content script 更新显示
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_COUNTDOWN',
          siteId: siteId,
          remainingTime: site.remainingTime
        })

        // 检查是否有运行时错误
        if (chrome.runtime.lastError) {
          if (__DEV__) console.warn('[updateTimer] 发送消息到 content script 失败:', chrome.runtime.lastError.message)
          // Tab可能已关闭或content script未加载，停止跟踪
          stopTracking(siteId)
          return
        }
      } catch (error) {
        // Tab可能已关闭或无法访问，停止跟踪
        if (__DEV__) console.warn('[updateTimer] 无法发送消息到标签页:', tabId, error.message)
        stopTracking(siteId)
        return
      }

      // 如果时间到了，执行跳转
      if (site.remainingTime <= 0) {
        await performRedirect(siteId, redirectUrl)
      }
    }
  } catch (error) {
    console.error('[background.js] 更新计时器失败:', error)
    // 发生错误时停止跟踪，避免继续出错
    if (trackingData[siteId]) {
      stopTracking(siteId)
    }
  }
}

// 执行跳转
async function performRedirect(siteId, redirectUrl) {
  if (!trackingData[siteId]) return

  const tabId = trackingData[siteId].tabId

  try {
    // 先尝试发送跳转消息给 content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'REDIRECT',
      url: redirectUrl
    })

    // 检查是否有运行时错误
    if (chrome.runtime.lastError) {
      if (__DEV__) console.warn('[performRedirect] 发送跳转消息失败，尝试直接跳转:', chrome.runtime.lastError.message)
      // 如果发送消息失败，尝试直接跳转
      await chrome.tabs.update(tabId, { url: redirectUrl })
      console.log('[performRedirect] 直接跳转成功:', redirectUrl)
    } else {
      console.log('[performRedirect] 已发送跳转消息到标签页:', tabId, '目标URL:', redirectUrl)
    }

    // 停止跟踪
    stopTracking(siteId)
  } catch (error) {
    console.error('[performRedirect] 跳转失败:', error)
    // 最后尝试直接更新标签页URL
    try {
      await chrome.tabs.update(tabId, { url: redirectUrl })
      console.log('[performRedirect] 备用跳转成功:', redirectUrl)
      stopTracking(siteId)
    } catch (updateError) {
      console.error('[performRedirect] 所有跳转方式都失败:', updateError)
      // 即使跳转失败也要停止跟踪，避免继续消耗资源
      stopTracking(siteId)
    }
  }
}

// 手动更新网站计时器（从设置页面调用）
async function updateSiteTimer(siteId, newRemainingTime) {
  try {
    const result = await safeStorageGet(['websites', 'reminderMessage'])

    if (!result) {
      if (__DEV__) console.warn('[updateSiteTimer] 扩展上下文已失效')
      return
    }

    const websites = normalizeWebsites(result.websites)

    const siteIndex = websites.findIndex(site => site.id === siteId)
    if (siteIndex !== -1) {
      websites[siteIndex].remainingTime = newRemainingTime
      await chrome.storage.local.set({ websites })

      // 如果正在跟踪这个网站，更新显示
      if (trackingData[siteId]) {
        const tabId = trackingData[siteId].tabId
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_COUNTDOWN',
            siteId: siteId,
            remainingTime: newRemainingTime
          })

          // 检查是否有运行时错误
          if (chrome.runtime.lastError) {
            if (__DEV__) console.warn('[updateSiteTimer] 发送消息失败:', chrome.runtime.lastError.message)
          }
        } catch (error) {
          if (__DEV__) console.warn('[updateSiteTimer] 更新显示失败:', error.message)
        }
      }
    }
  } catch (error) {
    console.error('[background.js] 更新计时器失败:', error)
  }
}

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId

  // 检查激活的标签页是否是摸鱼网站
  try {
    const tab = await chrome.tabs.get(activeTabId)
    await checkTabUrl(tab)
  } catch (error) {
    // 标签页可能已关闭，这是正常情况
    if (error.message?.includes('No tab with id')) {
      console.log('[tabs.onActivated] 标签页已关闭:', activeTabId)
    } else {
      console.error('[tabs.onActivated] 检查标签页失败:', error)
    }
  }
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await checkTabUrl(tab)
    } catch (error) {
      console.error('[tabs.onUpdated] 检查标签页URL失败:', error)
    }
  }
})

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  try {
    // 停止该标签页相关的所有跟踪
    for (const siteId in trackingData) {
      if (trackingData[siteId].tabId === tabId) {
        stopTracking(siteId)
      }
    }
    delete tabFocusState[tabId]
  } catch (error) {
    console.error('[tabs.onRemoved] 清理跟踪数据失败:', error)
  }
})

// 辅助函数：检查URL是否匹配网站的任一域名
function matchesAnyUrl(tabUrl, siteUrlString) {
  // 支持逗号、分号、空格分隔的多个URL
  const urls = siteUrlString.split(/[,;，；\s]+/).map(u => u.trim()).filter(u => u)
  return urls.some(url => tabUrl.includes(url))
}

// 检查标签页URL
async function checkTabUrl(tab) {
  if (!tab.url) return

  try {
    console.log('[checkTabUrl] 检查标签页:', tab.id, tab.url)
    const result = await safeStorageGet(['websites', 'reminderMessage'])

    if (!result) {
      if (__DEV__) console.warn('[checkTabUrl] 扩展上下文已失效')
      return
    }

    console.log('[checkTabUrl] Storage 原始结果:', result)
    console.log('[checkTabUrl] result.websites类型:', typeof result.websites)
    console.log('[checkTabUrl] 是否为数组:', Array.isArray(result.websites))

    const websites = normalizeWebsites(result.websites)
    const reminderMessageFromStorage =
      typeof result.reminderMessage === 'string'
        ? result.reminderMessage
        : DEFAULT_REMINDER_MESSAGE
    const reminderMessage =
      reminderMessageFromStorage.trim().length > 0
        ? reminderMessageFromStorage
        : DEFAULT_REMINDER_MESSAGE

    console.log('[checkTabUrl] websites内容:', websites)
    console.log('[checkTabUrl] websites长度:', websites.length)
    // 检查是否匹配任何摸鱼网站
    for (const site of websites) {
      console.log('[checkTabUrl] 检查网站:', site.name, site.url, 'enabled:', site.enabled)
      if (site.enabled && matchesAnyUrl(tab.url, site.url)) {
        // 匹配到摸鱼网站
        console.log('[checkTabUrl] ✓ 匹配到摸鱼网站:', site.name)
        const wasTrackedBefore = tabFocusState[tab.id] === true
        if (!wasTrackedBefore) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SHOW_REMINDER',
              message: reminderMessage,
              siteName: site.name
            })
            console.log('[checkTabUrl] 已发送提醒窗口消息:', tab.id)
          } catch (error) {
            if (__DEV__) console.warn('[checkTabUrl] 发送提醒失败:', error.message)
          }
        }

        tabFocusState[tab.id] = true

        if (!trackingData[site.id] || trackingData[site.id].tabId !== tab.id) {
          startTracking(site.id, tab.id, tab.url)
        }
        return
      }
    }

    console.log('[checkTabUrl] 未匹配到任何摸鱼网站')
    tabFocusState[tab.id] = false

    // 不是摸鱼网站，停止该标签页的所有跟踪
    for (const siteId in trackingData) {
      if (trackingData[siteId].tabId === tab.id) {
        stopTracking(siteId)
      }
    }
  } catch (error) {
    console.error('[background.js] 检查URL失败:', error)
  }
}
