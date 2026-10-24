/* =====================================================================
   Aether OS — ядро
   Хранилище (localStorage), настройки, коины, виртуальная ФС,
   уведомления, менеджер окон, панель задач, панель уведомлений,
   вход, загрузка, выключение.
   Все скрипты подключаются как обычные (не модули) и делят глобальную область.
   ===================================================================== */

/* ---------- Утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2, 10);

const KEY = {
  settings: 'aether_settings', coins: 'aether_coins', gstats: 'aether_gamestats',
  fs: 'aether_fs', notifs: 'aether_notifs', ai: 'aether_ai_history', farm: 'aether_farm'
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
  } catch (e) {
    return JSON.parse(JSON.stringify(fallback));
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.warn('localStorage: не удалось сохранить', key, e); return false; }
}

/* ---------- Иконки (SVG, stroke) ---------- */
const ICONS = {
  start: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  bt: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
  vol: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  bat: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/>',
  plane: '<path d="M2 14l20-8-6 16-4-6z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dnd: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  min: '<path d="M5 12h14"/>',
  max: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  restore: '<rect x="8" y="5" width="11" height="11" rx="1.5"/><path d="M5 8v11h11"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  monitor: '<path d="M3 17l5-6 4 3 4-6 5 5"/><path d="M3 3v18h18"/>',
  games: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 12h4M9 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
  ai: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  power: '<path d="M12 3v8"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.8a1.5 1.5 0 0 1 0 3H10.7a1.5 1.5 0 0 0 0 3h3.8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  brush: '<path d="M4 20c2-1 3-3 4-6l6-6 2 2-6 6c-3 1-5 2-6 4z"/>',
  display: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  access: '<circle cx="12" cy="5" r="2"/><path d="M5 9h14M12 9v12M8 21l4-6 4 6"/>',
  storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;
}

/* ---------- Язык, время ---------- */
const I18N = {
  ru: { search: 'Поиск приложений и файлов', settings: 'Настройки', lock: 'Заблокировать', off: 'Выключить',
        notifs: 'Уведомления', clear: 'Очистить', vol: 'Громкость', bri: 'Яркость', wifi: 'Wi-Fi',
        bt: 'Bluetooth', dnd: 'Не беспокоить', night: 'Ночной режим', plane: 'В самолёте', dark: 'Тёмная тема',
        noNotifs: 'Нет уведомлений', cal: 'Календарь' },
  en: { search: 'Search apps and files', settings: 'Settings', lock: 'Lock', off: 'Shut down',
        notifs: 'Notifications', clear: 'Clear', vol: 'Volume', bri: 'Brightness', wifi: 'Wi-Fi',
        bt: 'Bluetooth', dnd: 'Do not disturb', night: 'Night light', plane: 'Airplane mode', dark: 'Dark theme',
        noNotifs: 'No notifications', cal: 'Calendar' }
};
const t = k => (I18N[S.lang] || I18N.ru)[k] || k;
const locale = () => (S.lang === 'en' ? 'en-US' : 'ru-RU');
const tzOpt = () => (S.tz && S.tz !== 'auto' ? S.tz : undefined);

function fmtTime(d = new Date()) {
  try {
    return new Intl.DateTimeFormat(locale(), {
      hour: '2-digit', minute: '2-digit', second: S.showSeconds ? '2-digit' : undefined,
      hour12: !!S.hour12, timeZone: tzOpt()
    }).format(d);
  } catch (e) { return d.toTimeString().slice(0, 5); }
}
function fmtDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat(locale(), {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: tzOpt()
    }).format(d);
  } catch (e) { return d.toDateString(); }
}

/* ---------- Настройки ---------- */
const DEFAULTS = {
  theme: 'dark',            // dark | light | auto
  accent: '#4f8cff',
  glass: 0.72,              // прозрачность стекла
  blur: 24,                 // размытие, px
  wallpaper: 'aurora',      // ключ из WALLPAPERS или custom
  wallCustom: '',           // dataURL пользовательских обоев
  brightness: 100,          // 30..100
  fontPx: 14,               // размер текста интерфейса
  volume: 70,
  muted: false,
  wifi: true, bt: true, dnd: false, night: false, airplane: false,
  hour12: false, tz: 'auto', lang: 'ru',
  notifsOn: true,
  userName: 'Пользователь', avatarColor: '#4f8cff', password: '',
  highContrast: false, motion: true, showSeconds: false
};
let S = Object.assign({}, DEFAULTS, load(KEY.settings, {}));
function saveSettings() { save(KEY.settings, S); applySettings(); }

const WALLPAPERS = {
  aurora: 'linear-gradient(135deg,#1c2d5a,#5c2a6e 55%,#f08a4b)',
  ocean: 'linear-gradient(160deg,#0b3d91,#1d7fb8 50%,#7fe0d8)',
  forest: 'linear-gradient(160deg,#0f3d2e,#2e7d5b 60%,#c9e8a0)',
  night: 'radial-gradient(circle at 70% 20%,#2b2f5e,#07081a 70%)',
  sunset: 'linear-gradient(180deg,#2c1b4d 0%,#e25d6b 60%,#ffb36b 100%)',
  slate: 'linear-gradient(135deg,#2a2f3a,#0f1116)'
};

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '79, 140, 255';
}

function applySettings() {
  const root = document.documentElement;
  const theme = S.theme === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : S.theme;
  root.dataset.theme = theme;
  root.dataset.contrast = S.highContrast ? 'high' : 'normal';
  root.dataset.motion = S.motion ? 'on' : 'off';
  root.style.setProperty('--accent', S.accent);
  root.style.setProperty('--accent-rgb', hexToRgb(S.accent));
  root.style.setProperty('--glass-alpha', String(S.glass));
  root.style.setProperty('--blur', S.blur + 'px');
  root.style.setProperty('--ui-font', S.fontPx + 'px');
  const wp = $('#wallpaper');
  if (wp) {
    wp.style.background = (S.wallpaper === 'custom' && S.wallCustom)
      ? `url("${S.wallCustom}") center / cover no-repeat`
      : (WALLPAPERS[S.wallpaper] || WALLPAPERS.aurora);
  }
  const dim = $('#dim-overlay');
  if (dim) dim.style.opacity = ((100 - S.brightness) / 100 * 0.7).toFixed(2);
  const night = $('#night-overlay');
  if (night) night.classList.toggle('on', !!S.night);
  if (typeof renderTray === 'function') renderTray();
  if (typeof renderQuick === 'function') renderQuick();
  if (typeof renderCoinPill === 'function') renderCoinPill();
}

/* ---------- Коины ---------- */
const COIN_LISTENERS = [];
function coinsState() {
  return load(KEY.coins, { balance: 100000, history: [{ t: Date.now(), d: 100000, r: 'Стартовый бонус' }] });
}
function coinsBalance() { return coinsState().balance; }
function onCoins(fn) { COIN_LISTENERS.push(fn); }
function emitCoins() {
  COIN_LISTENERS.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  renderCoinPill();
}
function addCoins(n, reason = '') {
  if (!n) return coinsBalance();
  const st = coinsState();
  st.balance += n;
  st.history.unshift({ t: Date.now(), d: n, r: reason });
  st.history = st.history.slice(0, 200);
  save(KEY.coins, st);
  emitCoins();
  return st.balance;
}
/* Возвращает false, если коинов не хватает — тогда ничего не списывается. */
function spendCoins(n, reason = '') {
  const st = coinsState();
  if (st.balance < n) return false;
  st.balance -= n;
  st.history.unshift({ t: Date.now(), d: -n, r: reason });
  st.history = st.history.slice(0, 200);
  save(KEY.coins, st);
  emitCoins();
  return true;
}
function resetCoins() {
  save(KEY.coins, { balance: 100000, history: [{ t: Date.now(), d: 100000, r: 'Сброс баланса' }] });
  emitCoins();
}
function renderCoinPill() {
  const pill = $('#coin-pill');
  if (pill) pill.innerHTML = `${icon('coin')}<span>${coinsBalance()}</span>`;
}

/* ---------- Статистика игр ---------- */
function gameStats() { return load(KEY.gstats, { plays: {}, best: {} }); }
function recordGame(id, score = 0) {
  const st = gameStats();
  st.plays[id] = (st.plays[id] || 0) + 1;
  st.best[id] = Math.max(st.best[id] || 0, score);
  save(KEY.gstats, st);
}

/* ---------- Виртуальная файловая система ---------- */
function defaultFS() {
  return {
    '/': { dir: true },
    '/home': { dir: true },
    '/home/Documents': { dir: true },
    '/home/Pictures': { dir: true },
    '/home/Desktop': { dir: true },
    '/home/Documents/welcome.txt': {
      content: 'Добро пожаловать в Aether OS!\n\nЭто виртуальный диск, он хранится в localStorage вашего браузера.\nОткройте «Блокнот», чтобы редактировать файлы.\n', m: Date.now()
    }
  };
}
let FS = load(KEY.fs, null) || defaultFS();
if (!FS['/']) FS = defaultFS();
function fsSave() { save(KEY.fs, FS); }
function normPath(p) {
  const parts = [];
  String(p || '/').split('/').forEach(seg => {
    if (!seg || seg === '.') return;
    if (seg === '..') parts.pop(); else parts.push(seg);
  });
  return '/' + parts.join('/');
}
function fsParent(p) {
  if (p === '/') return '/';
  const i = p.lastIndexOf('/');
  return i <= 0 ? '/' : p.slice(0, i);
}
function fsName(p) { return p === '/' ? '/' : p.split('/').pop(); }
function fsIsDir(p) { return !!(FS[p] && FS[p].dir); }
function fsExists(p) { return p in FS; }
function fsList(dir) {
  return Object.keys(FS)
    .filter(k => k !== '/' && fsParent(k) === dir)
    .map(k => ({ path: k, name: fsName(k), dir: !!FS[k].dir, size: FS[k].content ? FS[k].content.length : 0 }))
    .sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
}
function fsRead(p) { return FS[p] && !FS[p].dir ? FS[p].content : null; }
function fsWrite(p, content) {
  if (!fsIsDir(fsParent(p))) return false;
  if (fsIsDir(p)) return false;
  FS[p] = { content, m: Date.now() };
  fsSave();
  return true;
}
function fsMkdir(p) {
  if (fsExists(p) || !fsIsDir(fsParent(p))) return false;
  FS[p] = { dir: true };
  fsSave();
  return true;
}
function fsDelete(p) {
  if (p === '/') return false;
  Object.keys(FS).forEach(k => { if (k === p || k.startsWith(p + '/')) delete FS[k]; });
  fsSave();
  return true;
}
function fsMove(from, to) {
  if (!fsExists(from) || fsExists(to) || !fsIsDir(fsParent(to))) return false;
  Object.keys(FS).filter(k => k === from || k.startsWith(from + '/')).forEach(k => {
    FS[to + k.slice(from.length)] = FS[k];
    delete FS[k];
  });
  fsSave();
  return true;
}
function fsSearch(q, limit = 12) {
  const needle = q.toLowerCase();
  return Object.keys(FS).filter(k => k !== '/' && fsName(k).toLowerCase().includes(needle)).slice(0, limit);
}

/* ---------- Уведомления ---------- */
function getNotifs() { return load(KEY.notifs, []); }
function addNotification(title, body = '', app = '') {
  const list = getNotifs();
  list.unshift({ id: uid(), title, body, app, t: Date.now() });
  save(KEY.notifs, list.slice(0, 60));
  renderNotifs();
  if (S.notifsOn && !S.dnd) showToast(title, body);
}
function showToast(title, body = '', ms = 3800) {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b>${esc(title)}</b>${body ? `<div class="muted">${esc(body)}</div>` : ''}`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, ms);
}
function renderNotifs() {
  const box = $('#notif-list');
  if (!box) return;
  const list = getNotifs();
  if (!list.length) { box.innerHTML = `<div class="notif-empty">${t('noNotifs')}</div>`; return; }
  box.innerHTML = list.slice(0, 30).map(n =>
    `<div class="notif"><span class="n-time">${esc(fmtTime(new Date(n.t)))}</span>` +
    `<div class="n-title">${esc(n.title)}</div>${n.body ? `<div class="muted">${esc(n.body)}</div>` : ''}</div>`
  ).join('');
}

/* ---------- Реестр приложений ---------- */
const APPS = [];
function registerApp(app) { APPS.push(app); }  // {id, name, icon, desktop, open(arg)}
function openApp(id, arg) {
  const a = APPS.find(x => x.id === id);
  if (a) a.open(arg);
}

/* ---------- Окна ---------- */
let Z = 100;
const WINS = [];
const deskBox = () => $('#windows').getBoundingClientRect();

function openWindow(opts) {
  if (opts.singleton) {
    const ex = WINS.find(w => w.appId === opts.appId);
    if (ex) { activateWin(ex, true); return ex; }
  }
  const box = deskBox();
  const w = Math.min(opts.w || 720, Math.max(320, box.width - 20));
  const h = Math.min(opts.h || 480, Math.max(240, box.height - 20));
  const off = (WINS.length % 8) * 26;

  const el = document.createElement('div');
  el.className = 'win' + (opts.glass ? ' glass' : '');
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  el.style.left = clamp(60 + off, 0, Math.max(0, box.width - w)) + 'px';
  el.style.top = clamp(24 + off, 0, Math.max(0, box.height - h)) + 'px';
  el.innerHTML = `
    <div class="win-bar">
      <span class="win-ico">${icon(opts.icon || 'file')}</span>
      <span class="win-title"></span>
      <button class="win-ctrl min" title="Свернуть">${icon('min')}</button>
      <button class="win-ctrl max" title="Развернуть">${icon('max')}</button>
      <button class="win-ctrl close" title="Закрыть">${icon('close')}</button>
    </div>
    <div class="win-body"></div>
    <div class="win-grip"></div>`;
  $('.win-title', el).textContent = opts.title || '';

  const win = {
    id: uid(), appId: opts.appId || '', title: opts.title || '', icon: opts.icon || 'file',
    el, body: $('.win-body', el), min: false, closed: false, onClose: null
  };
  win.setTitle = title => { win.title = title; $('.win-title', el).textContent = title; renderTaskbar(); };
  win.close = () => closeWin(win);
  win.focus = () => activateWin(win, true);

  $('#windows').appendChild(el);
  WINS.push(win);

  el.addEventListener('pointerdown', () => focusWin(win), true);
  $('.min', el).onclick = () => minWin(win);
  $('.max', el).onclick = () => toggleMax(win);
  $('.close', el).onclick = () => closeWin(win);
  $('.win-bar', el).addEventListener('dblclick', e => { if (!e.target.closest('button')) toggleMax(win); });
  bindDrag(win);
  bindResize(win);

  focusWin(win);
  try {
    if (opts.render) opts.render(win.body, win);
  } catch (e) {
    console.error(e);
    win.body.innerHTML = `<div style="padding:16px">Ошибка приложения: ${esc(e.message)}</div>`;
  }
  return win;
}

function bindDrag(win) {
  const bar = $('.win-bar', win.el);
  bar.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    if (win.el.classList.contains('max')) return;
    const box = deskBox();
    const r = win.el.getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId);
    const move = ev => {
      const x = clamp(ev.clientX - box.left - ox, -win.el.offsetWidth + 120, box.width - 120);
      const y = clamp(ev.clientY - box.top - oy, 0, box.height - 38);
      win.el.style.left = x + 'px';
      win.el.style.top = y + 'px';
    };
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });
}

function bindResize(win) {
  const grip = $('.win-grip', win.el);
  grip.addEventListener('pointerdown', e => {
    if (win.el.classList.contains('max')) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sw = win.el.offsetWidth, sh = win.el.offsetHeight;
    grip.setPointerCapture(e.pointerId);
    const move = ev => {
      const box = deskBox();
      win.el.style.width = clamp(sw + ev.clientX - sx, 300, box.width - win.el.offsetLeft) + 'px';
      win.el.style.height = clamp(sh + ev.clientY - sy, 180, box.height - win.el.offsetTop) + 'px';
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });
}

function focusWin(win) {
  if (win.closed) return;
  WINS.forEach(w => w.el.classList.remove('focused'));
  win.el.classList.add('focused');
  win.el.style.zIndex = ++Z;
  renderTaskbar();
}
function minWin(win) {
  win.min = true;
  win.el.classList.add('min');
  win.el.classList.remove('focused');
  renderTaskbar();
}
function activateWin(win, bring = false) {
  if (win.min) {
    win.min = false;
    win.el.classList.remove('min');
  }
  focusWin(win);
}
function toggleMax(win) {
  const el = win.el;
  if (el.classList.contains('max')) {
    el.classList.remove('max');
    const p = win.prev || { l: 60, t: 24, w: 720, h: 480 };
    Object.assign(el.style, { left: p.l + 'px', top: p.t + 'px', width: p.w + 'px', height: p.h + 'px' });
    $('.max', el).innerHTML = icon('max');
  } else {
    win.prev = { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    el.classList.add('max');
    Object.assign(el.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
    $('.max', el).innerHTML = icon('restore');
  }
}
function closeWin(win) {
  if (win.closed) return;
  win.closed = true;
  try { if (win.onClose) win.onClose(); } catch (e) { console.error(e); }
  win.el.classList.add('anim-out');
  setTimeout(() => win.el.remove(), 180);
  const i = WINS.indexOf(win);
  if (i >= 0) WINS.splice(i, 1);
  const next = WINS.filter(w => !w.min).pop();
  if (next) focusWin(next);
  renderTaskbar();
}

/* ---------- Панель задач ---------- */
function renderTaskbar() {
  const box = $('#tb-apps');
  if (!box) return;
  box.innerHTML = '';
  WINS.forEach(w => {
    const b = document.createElement('button');
    const focused = w.el.classList.contains('focused') && !w.min;
    b.className = 'tb-btn ' + (focused ? 'active' : 'min');
    b.title = w.title;
    b.innerHTML = icon(w.icon);
    b.onclick = () => {
      if (w.min) activateWin(w);
      else if (focused) minWin(w);
      else focusWin(w);
    };
    box.appendChild(b);
  });
}

/* ---------- Пуск ---------- */
function toggleStart(force) {
  const el = $('#start');
  const open = force ?? el.classList.contains('hidden');
  el.classList.toggle('hidden', !open);
  if (open) {
    renderStartGrid();
    $('#start-search').value = '';
    showStartGrid(true);
    setTimeout(() => $('#start-search').focus(), 30);
  }
}
function showStartGrid(on) {
  $('#start-grid').classList.toggle('hidden', !on);
  $('#start-results').classList.toggle('hidden', on);
}
function renderStartGrid() {
  $('#start-grid').innerHTML = APPS.map(a =>
    `<button class="start-tile" data-app="${esc(a.id)}">${icon(a.icon, 'lg')}<span>${esc(a.name)}</span></button>`
  ).join('');
  $$('.start-tile', $('#start-grid')).forEach(b => b.onclick = () => {
    toggleStart(false);
    openApp(b.dataset.app);
  });
}
function onStartSearch() {
  const q = $('#start-search').value.trim().toLowerCase();
  if (!q) { showStartGrid(true); return; }
  showStartGrid(false);
  const apps = APPS.filter(a => a.name.toLowerCase().includes(q));
  const files = fsSearch(q);
  const rows = [
    ...apps.map(a => `<button class="row" data-app="${esc(a.id)}">${icon(a.icon)}<span>${esc(a.name)}</span></button>`),
    ...files.map(p => `<button class="row" data-file="${esc(p)}">${icon(FS[p].dir ? 'folder' : 'file')}<span>${esc(p)}</span></button>`)
  ];
  const box = $('#start-results');
  box.innerHTML = rows.join('') || `<div class="muted" style="padding:10px">Ничего не найдено</div>`;
  $$('.row', box).forEach(b => b.onclick = () => {
    toggleStart(false);
    if (b.dataset.app) openApp(b.dataset.app);
    else if (b.dataset.file) openFile(b.dataset.file);
  });
}

/* ---------- Быстрые настройки и трей ---------- */
const QUICK = [
  { id: 'wifi', name: () => t('wifi'), icon: 'wifi',
    on: () => S.wifi && !S.airplane, state: () => S.airplane ? '—' : (S.wifi ? 'Подключено' : 'Выкл.'),
    toggle: () => { S.wifi = !S.wifi; if (S.wifi) S.airplane = false; } },
  { id: 'bt', name: () => t('bt'), icon: 'bt',
    on: () => S.bt && !S.airplane, state: () => S.bt ? 'Вкл.' : 'Выкл.',
    toggle: () => { S.bt = !S.bt; } },
  { id: 'dnd', name: () => t('dnd'), icon: 'dnd',
    on: () => S.dnd, state: () => S.dnd ? 'Вкл.' : 'Выкл.',
    toggle: () => { S.dnd = !S.dnd; } },
  { id: 'night', name: () => t('night'), icon: 'moon',
    on: () => S.night, state: () => S.night ? 'Вкл.' : 'Выкл.',
    toggle: () => { S.night = !S.night; } },
  { id: 'plane', name: () => t('plane'), icon: 'plane',
    on: () => S.airplane, state: () => S.airplane ? 'Вкл.' : 'Выкл.',
    toggle: () => { S.airplane = !S.airplane; } },
  { id: 'dark', name: () => t('dark'), icon: 'contrast',
    on: () => S.theme === 'dark', state: () => S.theme === 'dark' ? 'Тёмная' : 'Светлая',
    toggle: () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; } }
];
function renderQuick() {
  const box = $('#quick-grid');
  if (!box) return;
  box.innerHTML = QUICK.map(q =>
    `<button class="quick-tile ${q.on() ? 'on' : ''}" data-q="${q.id}">${icon(q.icon)}` +
    `<span class="qt-name">${esc(q.name())}</span><span class="qt-state">${esc(q.state())}</span></button>`
  ).join('');
  $$('.quick-tile', box).forEach(b => b.onclick = () => {
    const q = QUICK.find(x => x.id === b.dataset.q);
    q.toggle();
    saveSettings();
  });
}

let BAT = { level: 0.82, charging: false };
if (navigator.getBattery) {
  navigator.getBattery().then(b => {
    const up = () => { BAT = { level: b.level, charging: b.charging }; renderTray(); };
    up();
    b.addEventListener('levelchange', up);
    b.addEventListener('chargingchange', up);
  }).catch(() => {});
}
function renderTray() {
  const w = $('#tray-wifi'), v = $('#tray-vol'), b = $('#tray-bat');
  if (!w) return;
  const wifiOn = S.wifi && !S.airplane;
  w.innerHTML = icon(S.airplane ? 'plane' : 'wifi');
  w.style.opacity = wifiOn || S.airplane ? '1' : '.4';
  v.innerHTML = icon(S.muted || S.volume === 0 ? 'mute' : 'vol');
  b.innerHTML = icon('bat') + `<span style="font-size:11px">${Math.round(BAT.level * 100)}%${BAT.charging ? '⚡' : ''}</span>`;
}
function renderPanelSliders() {
  $('#vol-slider').value = S.volume;
  $('#bri-slider').value = S.brightness;
  $('#lbl-vol').textContent = t('vol');
  $('#lbl-bri').textContent = t('bri');
}

/* ---------- Календарь ---------- */
let calRef = new Date();
function renderCalendar() {
  const y = calRef.getFullYear(), m = calRef.getMonth();
  $('#cal-title').textContent = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(calRef);
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;   // неделя с понедельника
  const now = new Date();
  let html = '';
  for (let i = 0; i < 7; i++) {
    html += `<div class="dow">${new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i))}</div>`;
  }
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - offset + i);
    const isToday = d.toDateString() === now.toDateString();
    html += `<div class="d ${d.getMonth() !== m ? 'other' : ''} ${isToday ? 'today' : ''}">${d.getDate()}</div>`;
  }
  $('#cal-grid').innerHTML = html;
}

/* ---------- Панель уведомлений ---------- */
let panelTimer = null;
function togglePanel(force) {
  const el = $('#panel');
  const hidden = el.classList.contains('hidden');
  const open = force ?? hidden;
  clearTimeout(panelTimer);
  if (open) {
    el.classList.remove('hidden', 'closing');
    renderPanelContent();
  } else if (!hidden) {
    el.classList.add('closing');
    panelTimer = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('closing'); }, 200);
  }
}
function renderPanelContent() {
  renderCalendar();
  renderQuick();
  renderPanelSliders();
  renderNotifs();
  $('#lbl-notifs').textContent = t('notifs');
  $('#notif-clear').textContent = t('clear');
}

/* ---------- Контекстное меню ---------- */
function showCtx(x, y, items) {
  const el = $('#ctx');
  el.innerHTML = items.map(it => it === 'sep'
    ? '<div class="ctx-sep"></div>'
    : `<button class="ctx-item">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`
  ).join('');
  const real = items.filter(i => i !== 'sep');
  $$('.ctx-item', el).forEach((b, i) => b.onclick = () => { hideCtx(); real[i].fn(); });
  el.classList.remove('hidden');
  const r = el.getBoundingClientRect();
  el.style.left = clamp(x, 4, innerWidth - r.width - 4) + 'px';
  el.style.top = clamp(y, 4, innerHeight - r.height - 60) + 'px';
}
function hideCtx() { $('#ctx').classList.add('hidden'); }

/* ---------- Диалоги ---------- */
function showDialog({ title, text, yes = 'OK', no = null }) {
  return new Promise(resolve => {
    const ov = $('#dialog-overlay');
    $('#dialog-title').textContent = title;
    $('#dialog-text').textContent = text;
    const y = $('#dialog-yes'), n = $('#dialog-no');
    y.textContent = yes;
    n.textContent = no || '';
    n.classList.toggle('hidden', !no);
    ov.classList.remove('hidden');
    const done = val => { ov.classList.add('hidden'); y.onclick = n.onclick = null; resolve(val); };
    y.onclick = () => done(true);
    n.onclick = () => done(false);
  });
}

/* ---------- Рабочий стол: ярлыки и меню ---------- */
function renderIcons() {
  const box = $('#icons');
  box.innerHTML = '';
  APPS.filter(a => a.desktop !== false).forEach(a => {
    const b = document.createElement('button');
    b.className = 'shortcut';
    b.innerHTML = `<span class="sc-ico">${icon(a.icon, 'lg')}</span><span>${esc(a.name)}</span>`;
    b.onclick = e => {
      $$('.shortcut', box).forEach(s => s.classList.remove('sel'));
      b.classList.add('sel');
      e.stopPropagation();
    };
    b.ondblclick = () => openApp(a.id);
    box.appendChild(b);
  });
}

/* ---------- Часы ---------- */
let lastClock = '';
function tickClock() {
  const now = new Date();
  const tm = fmtTime(now), dt = fmtDate(now);
  const key = tm + dt;
  if (key === lastClock) return;
  lastClock = key;
  $('#clock-time').textContent = tm;
  $('#clock-date').textContent = dt;
}

/* ---------- Блокировка, выключение, вход ---------- */
let desktopReady = false;
function showLogin() {
  $('#boot').classList.add('hidden');
  $('#os').classList.add('hidden');
  $('#shutdown').classList.add('hidden');
  $('#login').classList.remove('hidden');
  const av = $('#login-avatar');
  av.textContent = (S.userName || 'U').trim().charAt(0).toUpperCase() || 'U';
  av.style.background = S.avatarColor;
  $('#login-name').textContent = S.userName || 'Пользователь';
  $('#login-err').textContent = '';
  $('#login-pass').value = '';
  setTimeout(() => $('#login-pass').focus(), 50);
}
function doLogin() {
  if ((S.password || '') !== $('#login-pass').value) {
    $('#login-err').textContent = 'Неверный пароль';
    return;
  }
  $('#login').classList.add('hidden');
  $('#os').classList.remove('hidden');
  startDesktop();
}
function lockScreen() {
  toggleStart(false);
  togglePanel(false);
  showLogin();
}
function shutdownOS() {
  toggleStart(false);
  togglePanel(false);
  $('#os').classList.add('hidden');
  $('#login').classList.add('hidden');
  $('#shutdown').classList.remove('hidden');
  setTimeout(() => location.reload(), 1400);
}

function startDesktop() {
  if (!desktopReady) {
    desktopReady = true;
    renderIcons();
    renderStartGrid();
    renderNotifs();
    renderCoinPill();
    renderTray();
    renderTaskbar();
    tickClock();
    if (!WINS.length) addNotification('Добро пожаловать', 'Aether OS готова к работе');
  }
  applySettings();
}

function bindGlobal() {
  $('#login-btn').onclick = doLogin;
  $('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  $('#start-btn').onclick = e => { e.stopPropagation(); toggleStart(); };
  $('#start-search').addEventListener('input', onStartSearch);
  $('#start-settings').onclick = () => { toggleStart(false); openApp('settings'); };
  $('#start-lock').onclick = lockScreen;
  $('#start-off').onclick = shutdownOS;

  $('#clock').onclick = e => { e.stopPropagation(); togglePanel(); };
  $('#tray').onclick = e => { e.stopPropagation(); togglePanel(true); };
  $('#coin-pill').onclick = () => openApp('games', 'coins');

  $('#cal-prev').innerHTML = icon('left');
  $('#cal-next').innerHTML = icon('right');
  $('#cal-prev').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1); renderCalendar(); };
  $('#cal-next').onclick = () => { calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1); renderCalendar(); };
  $('#vol-slider').addEventListener('input', e => { S.volume = +e.target.value; S.muted = false; saveSettings(); });
  $('#bri-slider').addEventListener('input', e => { S.brightness = +e.target.value; saveSettings(); });
  $('#notif-clear').onclick = () => { save(KEY.notifs, []); renderNotifs(); };

  onCoins(() => { if (!$('#start').classList.contains('hidden')) renderStartGrid(); });

  const desk = $('#desktop');
  desk.addEventListener('click', () => $$('.shortcut').forEach(s => s.classList.remove('sel')));
  desk.addEventListener('contextmenu', e => {
    if (e.target.closest('.win')) return;
    e.preventDefault();
    showCtx(e.clientX, e.clientY, [
      { label: 'Обновить', icon: 'refresh', fn: renderIcons },
      { label: 'Сменить обои', icon: 'brush', fn: () => openApp('settings', 'personal') },
      'sep',
      { label: 'Терминал', icon: 'term', fn: () => openApp('terminal') },
      { label: 'Настройки', icon: 'settings', fn: () => openApp('settings') }
    ]);
  });

  document.addEventListener('pointerdown', e => {
    const tg = e.target;
    if (!$('#panel').classList.contains('hidden') && !tg.closest('#panel, #clock, #tray')) togglePanel(false);
    if (!$('#start').classList.contains('hidden') && !tg.closest('#start, #start-btn')) toggleStart(false);
    if (!$('#ctx').classList.contains('hidden') && !tg.closest('#ctx')) hideCtx();
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      toggleStart(false); togglePanel(false); hideCtx();
    }
    if (e.altKey && e.key === 'F4' && !$('#os').classList.contains('hidden')) {
      e.preventDefault();
      const top = WINS.find(w => w.el.classList.contains('focused'));
      if (top) closeWin(top);
    }
  });

  setInterval(tickClock, 1000);
  window.addEventListener('storage', e => {
    if (e.key === KEY.settings) { S = Object.assign({}, DEFAULTS, load(KEY.settings, {})); applySettings(); }
    if (e.key === KEY.notifs) renderNotifs();
  });
}

function startBoot() {
  bindGlobal();
  applySettings();
  const steps = ['Загрузка ядра…', 'Монтирование файловой системы…', 'Запуск служб…', 'Подготовка рабочего стола…'];
  let p = 0;
  const fill = $('#boot-fill'), st = $('#boot-status');
  const iv = setInterval(() => {
    p += 25;
    fill.style.width = Math.min(p, 100) + '%';
    st.textContent = steps[Math.min(p / 25 - 1, steps.length - 1)];
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(showLogin, 350);
    }
  }, 320);
}
