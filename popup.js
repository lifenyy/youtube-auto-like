const DEFAULTS = {
  enabled: true,
  delayMs: 1200,
  showToast: true,
};

const $ = (id) => document.getElementById(id);

function formatTime(ts) {
  if (!ts) return '—';
  const date = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function load() {
  const { settings, stats } = await chrome.storage.local.get(['settings', 'stats']);
  const config = { ...DEFAULTS, ...(settings || {}) };

  $('enabled').checked = config.enabled;
  $('delay').value = config.delayMs;
  $('showToast').checked = config.showToast;

  $('count').textContent = String((stats && stats.count) || 0);
  $('lastAt').textContent = formatTime(stats && stats.lastAt);
}

async function save(patch) {
  const { settings } = await chrome.storage.local.get('settings');
  const config = { ...DEFAULTS, ...(settings || {}), ...patch };
  await chrome.storage.local.set({ settings: config });
}

$('enabled').addEventListener('change', (event) => save({ enabled: event.target.checked }));
$('showToast').addEventListener('change', (event) => save({ showToast: event.target.checked }));

$('delay').addEventListener('change', (event) => {
  const value = Math.min(10000, Math.max(0, Number(event.target.value) || 0));
  event.target.value = value;
  save({ delayMs: value });
});

$('reset').addEventListener('click', async () => {
  await chrome.storage.local.set({ stats: { count: 0 } });
  load();
});

load();
