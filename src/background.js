// background.js - 后台服务，监控标签页和管理计时器
let trackingData = {} // 存储每个网站的跟踪信息
let activeTabId = null

// 辅助函数：从 storage 读取 websites 并正确处理类型
function normalizeWebsites(storageWebsites) {
  if (Array.isArray(storageWebsites)) {
    return storageWebsites
  } else if (storageWebsites && typeof storageWebsites === 'object') {
    // 如果是对象（例如被错误保存为 {0: {...}, 1: {...}}），转换为数组
    console.warn('[normalizeWebsites] ⚠️ websites被存储为对象，转换为数组')
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
  const result = await chrome.storage.local.get(['redirectUrl', 'websites'])

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
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACKING') {
    startTracking(message.siteId, sender.tab.id, message.url)
  } else if (message.type === 'UPDATE_TIMER') {
    updateSiteTimer(message.siteId, message.remainingTime)
  }
})

// 开始跟踪网站
async function startTracking(siteId, tabId, url) {
  console.log('开始跟踪网站:', siteId, tabId)

  // 如果已经在跟踪，先停止
  if (trackingData[siteId]) {
    stopTracking(siteId)
  }

  // 检查当前网站的剩余时间
  try {
    const result = await chrome.storage.local.get(['websites', 'redirectUrl'])
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
    const result = await chrome.storage.local.get(['websites', 'redirectUrl'])
    const websites = normalizeWebsites(result.websites)
    const redirectUrl = result.redirectUrl || 'https://www.google.com'

    const siteIndex = websites.findIndex(site => site.id === siteId)
    if (siteIndex === -1) {
      stopTracking(siteId)
      return
    }

    const site = websites[siteIndex]

    // 减少剩余时间
    if (site.remainingTime > 0) {
      site.remainingTime--
      site.totalTime++

      // 保存更新
      await chrome.storage.local.set({ websites })

      // 通知 content script 更新显示
      if (trackingData[siteId]) {
        const tabId = trackingData[siteId].tabId
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_COUNTDOWN',
            siteId: siteId,
            remainingTime: site.remainingTime
          })
        } catch (error) {
          // Tab可能已关闭，停止跟踪
          stopTracking(siteId)
        }
      }

      // 如果时间到了，执行跳转
      if (site.remainingTime <= 0) {
        await performRedirect(siteId, redirectUrl)
      }
    }
  } catch (error) {
    console.error('更新计时器失败:', error)
  }
}

// 执行跳转
async function performRedirect(siteId, redirectUrl) {
  if (!trackingData[siteId]) return

  const tabId = trackingData[siteId].tabId

  try {
    // 发送跳转消息给 content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'REDIRECT',
      url: redirectUrl
    })
    console.log('已发送跳转消息到标签页:', tabId, '目标URL:', redirectUrl)

    // 停止跟踪
    stopTracking(siteId)
  } catch (error) {
    console.error('发送跳转消息失败，尝试直接跳转:', error)
    // 如果发送消息失败（例如 content script 未加载），尝试直接跳转
    try {
      await chrome.tabs.update(tabId, { url: redirectUrl })
      console.log('直接跳转成功:', redirectUrl)
      stopTracking(siteId)
    } catch (updateError) {
      console.error('直接跳转也失败:', updateError)
    }
  }
}

// 手动更新网站计时器（从设置页面调用）
async function updateSiteTimer(siteId, newRemainingTime) {
  try {
    const result = await chrome.storage.local.get(['websites'])
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
        } catch (error) {
          console.error('更新显示失败:', error)
        }
      }
    }
  } catch (error) {
    console.error('更新计时器失败:', error)
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
      console.log('标签页已关闭:', activeTabId)
    } else {
      console.error('检查标签页失败:', error)
    }
  }
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await checkTabUrl(tab)
  }
})

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  // 停止该标签页相关的所有跟踪
  for (const siteId in trackingData) {
    if (trackingData[siteId].tabId === tabId) {
      stopTracking(siteId)
    }
  }
})

// 检查标签页URL
async function checkTabUrl(tab) {
  if (!tab.url) return

  try {
    console.log('[checkTabUrl] 检查标签页:', tab.id, tab.url)
    const result = await chrome.storage.local.get(['websites'])
    console.log('[checkTabUrl] Storage 原始结果:', result)
    console.log('[checkTabUrl] result.websites类型:', typeof result.websites)
    console.log('[checkTabUrl] 是否为数组:', Array.isArray(result.websites))

    const websites = normalizeWebsites(result.websites)

    console.log('[checkTabUrl] websites内容:', websites)
    console.log('[checkTabUrl] websites长度:', websites.length)
    // 检查是否匹配任何摸鱼网站
    for (const site of websites) {
      console.log('[checkTabUrl] 检查网站:', site.name, site.url, 'enabled:', site.enabled)
      if (site.enabled && tab.url.includes(site.url)) {
        // 匹配到摸鱼网站
        console.log('[checkTabUrl] ✓ 匹配到摸鱼网站:', site.name)
        if (!trackingData[site.id] || trackingData[site.id].tabId !== tab.id) {
          startTracking(site.id, tab.id, tab.url)
        }
        return
      }
    }

    console.log('[checkTabUrl] 未匹配到任何摸鱼网站')

    // 不是摸鱼网站，停止该标签页的所有跟踪
    for (const siteId in trackingData) {
      if (trackingData[siteId].tabId === tab.id) {
        stopTracking(siteId)
      }
    }
  } catch (error) {
    console.error('检查URL失败:', error)
  }
}
