/* YouTube 自动点赞 —— content script
 * 流程：打开视频 → 等待点赞按钮 → 检查点赞状态 → 已点赞则跳过 → 未点赞则自动点赞
 */
(() => {
  'use strict';

  const DEFAULTS = {
    enabled: true,    // 总开关
    delayMs: 1200,    // 找到按钮后、点击前的等待时间（毫秒）
    showToast: true,  // 是否显示页面提示
  };

  const TOAST_MS = 2600;
  const BUTTON_WAIT_MS = 8000;
  const VERIFY_MS = 3000;

  // 覆盖新旧版观看页 / 移动网页 / Shorts 的点赞按钮
  const LIKE_SELECTORS = [
    'like-button-view-model button',
    '#segmented-like-button button',
    'ytd-watch-metadata like-button-view-model button',
    '#top-level-buttons-computed ytd-toggle-button-renderer:nth-of-type(1) button',
    '#like-button button',
    'ytd-menu-renderer #top-level-buttons ytd-toggle-button-renderer:first-of-type button',
  ];

  let settings = { ...DEFAULTS };
  const handled = new Set();   // 已处理过的视频 ID（本页面会话内不再重复处理）
  const inflight = new Set();  // 正在处理的视频 ID
  let currentVideoId = null;
  let navToken = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const log = (...args) => console.debug('[YT 自动点赞]', ...args);

  /* ---------------- 设置 ---------------- */
  async function loadSettings() {
    try {
      const stored = await chrome.storage.local.get('settings');
      settings = { ...DEFAULTS, ...(stored.settings || {}) };
    } catch (err) {
      log('读取设置失败，使用默认设置', err);
    }
  }
  loadSettings();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
    }
  });

  /* ---------------- 页面识别 ---------------- */
  function getVideoId() {
    try {
      const url = new URL(location.href);
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const shorts = url.pathname.match(/^\/shorts\/([\w-]{6,})/);
      return shorts ? shorts[1] : null;
    } catch {
      return null;
    }
  }

  /* ---------------- 点赞按钮 ---------------- */
  function findLikeButton() {
    for (const selector of LIKE_SELECTORS) {
      for (const button of document.querySelectorAll(selector)) {
        if (!button.hasAttribute('aria-pressed')) continue;
        if (button.closest('dislike-button-view-model, #segmented-dislike-button, #dislike-button')) continue;
        const label = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''}`.toLowerCase();
        if (/dislike|不喜欢|不爱/.test(label)) continue;
        return button;
      }
    }
    return null;
  }

  function isLiked(button) {
    return !!button && button.getAttribute('aria-pressed') === 'true';
  }

  async function waitForLikeButton(timeoutMs = BUTTON_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const button = findLikeButton();
      if (button) return button;
      if (Date.now() >= deadline) return null;
      await sleep(200);
    }
  }

  async function verifyLiked(timeoutMs = VERIFY_MS) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (isLiked(findLikeButton())) return true;
      if (Date.now() >= deadline) return false;
      await sleep(150);
    }
  }

  function clickLike(button) {
    try {
      button.scrollIntoView({ block: 'center' });
    } catch {
      /* 忽略滚动失败 */
    }
    button.click();
  }

  /* ---------------- 主流程 ---------------- */
  async function handleVideo(videoId, token) {
    if (!settings.enabled) {
      log('插件已关闭，跳过', videoId);
      return;
    }
    if (handled.has(videoId) || inflight.has(videoId)) {
      log('该视频已处理过，跳过', videoId);
      return;
    }

    inflight.add(videoId);
    try {
      const button = await waitForLikeButton();
      if (token !== navToken) return;              // 已切换到别的视频
      if (!button) {
        log('未找到点赞按钮，跳过', videoId);
        return;
      }

      if (isLiked(button)) {
        handled.add(videoId);
        log('已经是点赞状态，跳过', videoId);
        return;
      }

      await sleep(Math.max(0, Number(settings.delayMs) || 0));
      if (token !== navToken) return;

      const fresh = findLikeButton();
      if (!fresh) return;
      if (isLiked(fresh)) {                        // 等待期间状态变了
        handled.add(videoId);
        log('等待期间已点赞，跳过', videoId);
        return;
      }

      clickLike(fresh);
      const ok = await verifyLiked();
      handled.add(videoId);                        // 成功与否都记账，避免反复点击
      if (ok) {
        toast('已自动点赞 👍');
        reportLiked(videoId);
      } else {
        toast('自动点赞失败，可能未登录 YouTube', 'warn');
      }
      log(ok ? '自动点赞成功' : '自动点赞失败', videoId);
    } catch (err) {
      log('处理视频时出错', err);
    } finally {
      inflight.delete(videoId);
    }
  }

  function checkNavigation() {
    const videoId = getVideoId();
    if (videoId === currentVideoId) return;
    currentVideoId = videoId;
    navToken += 1;
    if (!videoId) return;
    const token = navToken;
    setTimeout(() => {
      if (token === navToken) handleVideo(videoId, token);
    }, 0);
  }

  /* ---------------- 提示与统计 ---------------- */
  let toastEl = null;
  let toastTimer = 0;

  function toast(text, type = 'ok') {
    if (!settings.showToast) return;
    try {
      if (!toastEl || !toastEl.isConnected) {
        toastEl = document.createElement('div');
        toastEl.className = 'yt-auto-like-toast';
        (document.body || document.documentElement).appendChild(toastEl);
      }
      toastEl.textContent = text;
      toastEl.dataset.type = type;
      toastEl.classList.add('yt-auto-like-toast--show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('yt-auto-like-toast--show'), TOAST_MS);
    } catch (err) {
      log('显示提示失败', err);
    }
  }

  async function reportLiked(videoId) {
    try {
      const stored = await chrome.storage.local.get('stats');
      const stats = stored.stats || {};
      await chrome.storage.local.set({
        stats: {
          count: (stats.count || 0) + 1,
          lastAt: Date.now(),
          lastVideoId: videoId,
        },
      });
    } catch (err) {
      log('写入统计失败', err);
    }
  }

  /* ---------------- 监听页面切换（SPA） ---------------- */
  document.addEventListener('yt-navigate-finish', checkNavigation, true);
  document.addEventListener('yt-page-data-updated', checkNavigation, true);
  window.addEventListener('popstate', checkNavigation, true);
  setInterval(checkNavigation, 1000);              // 兜底轮询，覆盖 history 变化

  checkNavigation();
})();

