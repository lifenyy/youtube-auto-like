# YouTube 自动点赞 / YouTube Auto Like

一个 Chrome Manifest V3 扩展：打开 YouTube 视频时自动点赞；已点赞则跳过。

A Chrome Manifest V3 extension that automatically likes YouTube videos when opened. If a video is already liked, it skips the action.

## 功能 / Features

- 打开视频页自动点赞，无需手动确认。 / Automatically likes videos when a watch page opens.
- 已点赞的视频自动跳过，不会重复点赞。 / Skips videos that are already liked.
- 支持 YouTube 单页切换（推荐视频、自动播放、Shorts），无需刷新。 / Supports YouTube SPA navigation, autoplay, and Shorts without reloading.
- 同一个视频在本次页面内只处理一次。 / Processes each video only once per page session.
- 未登录导致点赞失败时给出提示。 / Shows a notice when login is required for liking.
- 弹窗可查看累计自动点赞次数，可开关、调整等待时间。 / Popup shows total automatic likes, with on/off and delay controls.

## 安装 / Installation

1. 下载仓库源码或 ZIP。 / Download the repository source or ZIP.
2. 打开 `chrome://extensions/`。 / Open `chrome://extensions/`.
3. 开启右上角「开发者模式」。 / Enable Developer mode.
4. 点击「加载已解压的扩展程序」。 / Click "Load unpacked".
5. 选择包含 `manifest.json` 的目录。 / Select the directory containing `manifest.json`.

## 使用 / Usage

- 安装后直接打开任意 YouTube 视频即可。 / Open any YouTube video after installation.
- 视频加载完成后，插件会自动点赞并显示左下角提示。 / The extension likes the video after it loads and shows a bottom-left notice.
- 点击工具栏图标可以开关自动点赞、调整等待时间、重置统计。 / Use the toolbar popup to toggle automatic liking, adjust delay, or reset statistics.

## 工作原理 / How it works

1. 内容脚本监听 YouTube 页面导航，并解析 `/watch?v=...` 或 `/shorts/...` 中的视频 ID。 / The content script listens for navigation and extracts the video ID from the URL.
2. 等待点赞按钮出现并读取 `aria-pressed`。 / Waits for the Like button and reads `aria-pressed`.
3. 已点赞则跳过；未点赞则延迟后点击，并校验结果。 / Already liked videos are skipped; otherwise the button is clicked after a delay and verified.

## 文件结构 / File structure

```
youtube-auto-like/
├── manifest.json     # Manifest V3
├── background.js     # Service Worker
├── content.js        # Video detection and auto-like logic
├── content.css       # Notice styles
├── popup.html        # Popup UI
├── popup.css         # Popup styles
├── popup.js          # Popup logic
├── icon16.png        # Extension icon 16px
├── icon32.png        # Extension icon 32px
├── icon48.png        # Extension icon 48px
├── icon128.png       # Extension icon 128px
└── README.md
```

## 权限 / Permissions

- `storage`: 保存开关、延迟和统计。 / Stores settings, delay, and statistics.
- `*://*.youtube.com/*`: 仅在 YouTube 页面运行。 / Runs only on YouTube pages.

## 常见问题 / FAQ

**打开视频没有自动点赞？ / No automatic like?**
确认扩展已启用、弹窗中的开关已打开，并且已登录 YouTube。刷新视频页面后重试。 / Make sure the extension is enabled, the popup toggle is on, and you are logged in to YouTube. Refresh the video page and try again.

**会不会点击「不喜欢」？ / Does it click Dislike?**
不会。脚本会排除所有 dislike/不喜欢 按钮。 / No. The script explicitly excludes dislike buttons.

**会上传数据吗？ / Does it upload data?**
不会。设置和统计只保存在浏览器本地。 / No. Settings and statistics stay in the local browser storage.

## 卸载 / Uninstall

在 `chrome://extensions/` 中找到本扩展，点击「移除」。 / Find the extension in `chrome://extensions/` and click Remove.
