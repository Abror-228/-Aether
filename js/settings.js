/* =====================================================================
   Aether OS — Настройки
   Разделы: Персонализация, Экран, Звук, Сеть (имитация), Время и язык,
   Уведомления, Аккаунт, Хранилище, Игры и коины, Специальные
   возможности, О системе. Все значения сохраняются в localStorage.
   ===================================================================== */

/* Короткий звуковой сигнал через WebAudio (без внешних файлов) */
function beep(freq = 660, ms = 120) {
  if (S.muted || S.volume === 0) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = (S.volume / 100) * 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
    setTimeout(() => ctx.close(), ms + 100);
  } catch (e) { /* звук недоступен — тихо пропускаем */ }
}

const SET_SECTIONS = [
  { id: 'personal', name: 'Персонализация', icon: 'brush' },
  { id: 'display', name: 'Экран', icon: 'display' },
  { id: 'sound', name: 'Звук', icon: 'vol' },
  { id: 'network', name: 'Сеть', icon: 'wifi' },
  { id: 'time', name: 'Время и язык', icon: 'clock' },
  { id: 'notifs', name: 'Уведомления', icon: 'bell' },
  { id: 'account', name: 'Аккаунт', icon: 'user' },
  { id: 'storage', name: 'Хранилище', icon: 'storage' },
  { id: 'games', name: 'Игры и коины', icon: 'coin' },
  { id: 'access', name: 'Специальные возможности', icon: 'access' },
  { id: 'about', name: 'О системе', icon: 'info' }
];
const ACCENTS = ['#4f8cff', '#7c5cff', '#e5484d', '#f76b15', '#30a46c', '#00a2c7', '#d6409f', '#8b8d98'];
const AVATAR_COLORS = ['#4f8cff', '#7c5cff', '#e5484d', '#f76b15', '#30a46c', '#d6409f'];
const WIFI_NETS = ['Home-5G', 'Cafe_Free', 'Office-Guest'];
const BT_DEVICES = ['Наушники (имитация)', 'Колонка JBL (имитация)', 'Смартфон (имитация)'];

let settingsWin = null;
let settingsSection = 'personal';

/* ---------- Вспомогательные элементы разметки ---------- */
const sRow = (title, hint, ctl) =>
  `<div class="set-row"><div><div>${title}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div><div>${ctl}</div></div>`;
const sSwitch = key => `<button class="switch ${S[key] ? 'on' : ''}" data-sw="${key}" aria-label="${key}"></button>`;
const sRange = (key, min, max, step = 1) =>
  `<input type="range" min="${min}" max="${max}" step="${step}" value="${S[key]}" data-set="${key}" data-num="1" style="width:180px">`;
const sSelect = (key, opts) =>
  `<select class="input" data-set="${key}">${opts.map(([v, l]) =>
    `<option value="${esc(v)}" ${String(S[key]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const sCard = inner => `<div class="set-card">${inner}</div>`;
const sSwatches = (list, current, attr) =>
  `<div class="swatches">${list.map(c =>
    `<button class="swatch ${c === current ? 'on' : ''}" style="background:${c}" data-${attr}="${c}" aria-label="${c}"></button>`).join('')}</div>`;

/* ---------- Разделы ---------- */
const SET_RENDER = {
  personal() {
    const wpKeys = Object.keys(WALLPAPERS);
    return `
      ${sCard(
        sRow('Тема', 'Тёмная, светлая или по системе', sSelect('theme', [['dark', 'Тёмная'], ['light', 'Светлая'], ['auto', 'Системная']])) +
        sRow('Акцентный цвет', 'Для кнопок, выделения и переключателей', sSwatches(ACCENTS, S.accent, 'accent')) +
        sRow('Прозрачность панелей', 'Насколько видно сквозь окна и панель', sRange('glass', 0.3, 0.95, 0.01)) +
        sRow('Размытие фона', 'Сила blur у панелей', sRange('blur', 0, 40))
      )}
      ${sCard(`
        <div class="set-row" style="flex-direction:column;align-items:stretch">
          <div>Обои</div>
          <div class="wallpapers">
            ${wpKeys.map(k => `<button class="wp ${S.wallpaper === k ? 'on' : ''}" style="background:${WALLPAPERS[k]}" data-wp="${k}" aria-label="${k}"></button>`).join('')}
            ${S.wallCustom ? `<button class="wp ${S.wallpaper === 'custom' ? 'on' : ''}" style="background:url('${S.wallCustom}') center/cover" data-wp="custom" aria-label="Свои"></button>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            <label class="btn" style="cursor:pointer">Загрузить свои<input type="file" accept="image/*" data-file="wall" hidden></label>
            ${S.wallCustom ? '<button class="btn ghost" data-act="clearwall">Удалить свои</button>' : ''}
          </div>
        </div>`)}`;
  },

  display() {
    return sCard(
      sRow('Яркость', 'Затемнение экрана (программное)', sRange('brightness', 30, 100)) +
      sRow('Ночной режим', 'Тёплый оттенок экрана', sSwitch('night')) +
      sRow('Анимации', 'Плавные переходы и открытие окон', sSwitch('motion'))
    );
  },

  sound() {
    return sCard(
      sRow('Громкость', 'Общая громкость системы', sRange('volume', 0, 100)) +
      sRow('Выключить звук', '', sSwitch('muted')) +
      sRow('Проверка звука', 'Короткий сигнал', '<button class="btn" data-act="testsound">Проиграть</button>')
    );
  },

  network() {
    const net = S.wifiName || WIFI_NETS[0];
    const nets = WIFI_NETS.map(n => `
      <div class="set-row">
        <div>${icon('wifi')} ${esc(n)} ${n === net && S.wifi && !S.airplane ? '<span class="muted">· подключено</span>' : ''}</div>
        <button class="btn" data-net="${esc(n)}" ${!S.wifi || S.airplane ? 'disabled' : ''}>Подключиться</button>
      </div>`).join('');
    const devs = BT_DEVICES.map(d => `
      <div class="set-row"><div>${icon('bt')} ${esc(d)}</div>
      <button class="btn" data-dev="${esc(d)}" ${!S.bt || S.airplane ? 'disabled' : ''}>Сопрячь</button></div>`).join('');
    return `
      ${sCard(
        sRow('Wi-Fi', S.airplane ? 'Отключено режимом «в самолёте»' : (S.wifi ? 'Включено' : 'Выключено'), sSwitch('wifi')) +
        sRow('Bluetooth', S.bt ? 'Включено' : 'Выключено', sSwitch('bt')) +
        sRow('Режим «в самолёте»', 'Отключает беспроводные сети', sSwitch('airplane'))
      )}
      <div class="hint muted">Сети и устройства ниже имитированы: реального доступа к радиомодулю у веб-страницы нет.</div>
      ${sCard(`<div class="set-row"><b>Доступные сети</b></div>${nets}`)}
      ${sCard(`<div class="set-row"><b>Устройства Bluetooth</b></div>${devs}`)}`;
  },

  time() {
    const tzs = [['auto', 'Автоматически (как в системе)'], ['Europe/Moscow', 'Москва (UTC+3)'], ['Europe/London', 'Лондон'],
      ['Europe/Berlin', 'Берлин'], ['America/New_York', 'Нью-Йорк'], ['Asia/Tokyo', 'Токио'], ['UTC', 'UTC']];
    return sCard(
      sRow('Формат 24 часа', 'Выкл. — 12-часовой формат с AM/PM', sSwitch('hour12')) +
      sRow('Показывать секунды', 'В часах на панели задач', sSwitch('showSeconds')) +
      sRow('Часовой пояс', '', sSelect('tz', tzs)) +
      sRow('Язык интерфейса', '', sSelect('lang', [['ru', 'Русский'], ['en', 'English']]))
    ) + `<div class="hint muted">Сейчас: ${esc(fmtTime())} · ${esc(fmtDate())}</div>`;
  },

  notifs() {
    const n = getNotifs().length;
    return sCard(
      sRow('Показывать уведомления', 'Всплывающие подсказки в углу экрана', sSwitch('notifsOn')) +
      sRow('Не беспокоить', 'Уведомления копятся в панели, без всплытия', sSwitch('dnd'))
    ) + sCard(
      sRow('Журнал уведомлений', `Сейчас записей: ${n}`, '<button class="btn" data-act="clearnotifs">Очистить</button>')
    );
  },

  account() {
    return sCard(
      sRow('Имя пользователя', '', `<input class="input" value="${esc(S.userName)}" data-set="userName" maxlength="32">`) +
      sRow('Цвет аватара', '', sSwatches(AVATAR_COLORS, S.avatarColor, 'avatar')) +
      sRow('Пароль входа', 'Пусто — вход без пароля. Хранится в localStorage этого браузера, без шифрования.',
        `<input class="input" type="password" value="${esc(S.password)}" data-set="password" autocomplete="new-password">`)
    ) + `<div style="display:flex;align-items:center;gap:12px">
          <div class="avatar big" style="background:${S.avatarColor}">${esc((S.userName || 'U').charAt(0).toUpperCase())}</div>
          <div><b>${esc(S.userName)}</b><div class="muted">Локальная учётная запись</div></div></div>`;
  },

  storage() {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    const files = Object.keys(FS).length;
    return sCard(
      sRow('Использовано браузером', `${(bytes / 1024).toFixed(1)} КБ из ~5 МБ`, '') +
      sRow('Файлы на виртуальном диске', `${files} объектов`, '<button class="btn danger" data-act="clearfiles">Очистить</button>') +
      sRow('Журнал уведомлений', '', '<button class="btn" data-act="clearnotifs">Очистить</button>') +
      sRow('История генератора', '', '<button class="btn" data-act="clearai">Очистить</button>')
    ) + sCard(
      sRow('Сброс настроек', 'Вернуть все параметры по умолчанию', '<button class="btn danger" data-act="resetsettings">Сбросить</button>') +
      sRow('Полный сброс', 'Удалить всё: файлы, коины, историю, настройки', '<button class="btn danger" data-act="resetall">Удалить всё</button>')
    );
  },

  games() {
    const st = gameStats();
    const meta = window.GAME_META || [];
    const hist = coinsState().history.slice(0, 50);
    const rows = hist.length
      ? hist.map(h => `<div class="hist-row"><span>${esc(new Date(h.t).toLocaleString(locale()))} · ${esc(h.r)}</span>` +
          `<b class="${h.d >= 0 ? 'pos' : 'neg'}">${h.d >= 0 ? '+' : ''}${h.d}</b></div>`).join('')
      : '<div class="muted">История пуста</div>';
    const games = meta.map(g => `<div class="set-row"><div>${esc(g.name)}</div>` +
      `<div class="muted">сыграно: ${st.plays[g.id] || 0} · рекорд: ${st.best[g.id] || 0}</div></div>`).join('');
    return `
      ${sCard(sRow('Баланс коинов', 'Списывается генератором, начисляется за игры',
        `<b style="font-size:20px">${coinsBalance()}</b>`) +
        sRow('Сбросить баланс', 'Вернуть 100000 коинов', '<button class="btn danger" data-act="resetcoins">Сбросить</button>'))}
      ${sCard(`<div class="set-row"><b>Статистика игр</b></div>${games || '<div class="muted">Нет игр</div>'}`)}
      ${sCard(`<div class="set-row"><b>История коинов</b></div>${rows}`)}`;
  },

  access() {
    return sCard(
      sRow('Размер текста', 'Базовый размер шрифта интерфейса', sSelect('fontPx', [[12, '12 px'], [13, '13 px'], [14, '14 px'], [16, '16 px'], [18, '18 px']])) +
      sRow('Высокий контраст', 'Чётче границы и цвета текста', sSwitch('highContrast')) +
      sRow('Уменьшить анимации', 'Отключает плавные переходы', `<button class="switch ${!S.motion ? 'on' : ''}" data-sw="motionOff" aria-label="reduce motion"></button>`)
    );
  },

  about() {
    const up = Math.round(performance.now() / 1000);
    return sCard(`<div class="kv">
      <div>Система</div><div>Aether OS 1.0 (web)</div>
      <div>Технологии</div><div>HTML, CSS, JavaScript</div>
      <div>Браузер</div><div style="word-break:break-all">${esc(navigator.userAgent)}</div>
      <div>Экран</div><div>${innerWidth} × ${innerHeight}</div>
      <div>Время работы сессии</div><div>${Math.floor(up / 60)} мин ${up % 60} с</div>
      <div>Язык</div><div>${esc(navigator.language || '—')}</div>
    </div>`);
  }
};

/* ---------- Окно настроек ---------- */
registerApp({ id: 'settings', name: 'Настройки', icon: 'settings', open: sec => openSettings(sec) });

function openSettings(section) {
  if (section && SET_RENDER[section]) settingsSection = section;
  if (settingsWin && WINS.includes(settingsWin) && !settingsWin.closed) {
    activateWin(settingsWin, true);
    showSettingsSection(settingsSection);
    return;
  }
  settingsWin = openWindow({
    appId: 'settings', title: 'Настройки', icon: 'settings', w: 820, h: 540, glass: true,
    render: (body, win) => {
      settingsWin = win;
      body.innerHTML = `
        <div class="settings" style="height:100%">
          <nav class="set-nav">
            ${SET_SECTIONS.map(s => `<button data-sec="${s.id}">${icon(s.icon)}<span>${esc(s.name)}</span></button>`).join('')}
          </nav>
          <div class="set-body"></div>
        </div>`;
      $$('[data-sec]', body).forEach(b => b.onclick = () => showSettingsSection(b.dataset.sec));
      showSettingsSection(settingsSection);
    }
  });
}

function showSettingsSection(id) {
  if (!settingsWin || settingsWin.closed) return;
  settingsSection = SET_RENDER[id] ? id : 'personal';
  const root = settingsWin.body;
  $$('[data-sec]', root).forEach(b => b.classList.toggle('on', b.dataset.sec === settingsSection));
  const box = $('.set-body', root);
  const sec = SET_SECTIONS.find(s => s.id === settingsSection);
  box.innerHTML = `<h2>${esc(sec.name)}</h2>` + SET_RENDER[settingsSection]();
  box.scrollTop = 0;
  bindSettingsControls(box);
}

/* Общий обработчик: переключатели, ползунки, поля, кнопки действий */
function bindSettingsControls(root) {
  const refresh = () => showSettingsSection(settingsSection);

  $$('[data-sw]', root).forEach(b => b.onclick = () => {
    const k = b.dataset.sw;
    if (k === 'motionOff') { S.motion = !S.motion; }
    else if (k === 'airplane') { S.airplane = !S.airplane; }
    else { S[k] = !S[k]; }
    saveSettings();
    if (k === 'hour12' || k === 'showSeconds' || k === 'notifsOn' || k === 'wifi' || k === 'bt' || k === 'airplane' || k === 'dnd' || k === 'motionOff') {
      if (k === 'hour12' || k === 'showSeconds') lastClock = '';
      refresh();
    } else {
      b.classList.toggle('on', !!S[k]);
    }
    if (k === 'hour12' || k === 'showSeconds') tickClock();
    if (k === 'dnd' || k === 'notifsOn') renderNotifs();
  });

  const onField = e => {
    const el = e.target;
    const k = el.dataset.set;
    if (!k) return;
    let v = el.value;
    if (el.dataset.num) v = Number(v);
    S[k] = v;
    saveSettings();
    if (k === 'lang') { applyLang(); refresh(); }
    if (k === 'tz' || k === 'fontPx' || k === 'theme') { lastClock = ''; tickClock(); }
    if (k === 'userName') renderNotifs();
    if (k === 'brightness' || k === 'volume' || k === 'glass' || k === 'blur') {
      if (k === 'volume') renderTray();
    }
    if (el.tagName === 'SELECT' || el.type === 'password') {
      /* ничего дополнительно */
    }
  };
  $$('[data-set]', root).forEach(el => {
    el.addEventListener('input', onField);
    el.addEventListener('change', onField);
  });

  $$('[data-accent]', root).forEach(b => b.onclick = () => { S.accent = b.dataset.accent; saveSettings(); refresh(); });
  $$('[data-avatar]', root).forEach(b => b.onclick = () => { S.avatarColor = b.dataset.avatar; saveSettings(); refresh(); });
  $$('[data-wp]', root).forEach(b => b.onclick = () => { S.wallpaper = b.dataset.wp; saveSettings(); refresh(); });

  const fileIn = $('[data-file="wall"]', root);
  if (fileIn) fileIn.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadCustomWallpaper(f);
  });

  $$('[data-net]', root).forEach(b => b.onclick = () => {
    S.wifiName = b.dataset.net; S.wifi = true; S.airplane = false;
    saveSettings();
    addNotification('Wi-Fi', 'Подключено к ' + b.dataset.net);
    refresh();
  });
  $$('[data-dev]', root).forEach(b => b.onclick = () => {
    S.bt = true;
    saveSettings();
    addNotification('Bluetooth', 'Сопряжено (имитация): ' + b.dataset.dev);
    refresh();
  });

  $$('[data-act]', root).forEach(b => b.onclick = () => runSettingsAction(b.dataset.act, refresh));
}

function runSettingsAction(act, refresh) {
  switch (act) {
    case 'testsound': beep(880); break;
    case 'clearwall':
      S.wallCustom = '';
      if (S.wallpaper === 'custom') S.wallpaper = 'aurora';
      saveSettings(); refresh(); break;
    case 'clearnotifs': save(KEY.notifs, []); renderNotifs(); refresh(); break;
    case 'clearai': save(KEY.ai, []); refresh(); break;
    case 'clearfiles':
      showDialog({ title: 'Очистить файлы?', text: 'Все файлы виртуального диска будут удалены.', yes: 'Очистить', no: 'Отмена' })
        .then(ok => { if (ok) { FS = defaultFS(); fsSave(); refresh(); } });
      break;
    case 'resetcoins':
      showDialog({ title: 'Сбросить коины?', text: 'Баланс станет 50, история очистится.', yes: 'Сбросить', no: 'Отмена' })
        .then(ok => { if (ok) { resetCoins(); refresh(); } });
      break;
    case 'resetsettings':
      showDialog({ title: 'Сбросить настройки?', text: 'Все параметры вернутся к значениям по умолчанию.', yes: 'Сбросить', no: 'Отмена' })
        .then(ok => { if (ok) { S = Object.assign({}, DEFAULTS); saveSettings(); applyLang(); refresh(); } });
      break;
    case 'resetall':
      showDialog({ title: 'Полный сброс?', text: 'Удалятся файлы, коины, статистика, история и настройки.', yes: 'Удалить всё', no: 'Отмена' })
        .then(ok => {
          if (!ok) return;
          Object.values(KEY).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
          location.reload();
        });
      break;
  }
}

/* Пользовательские обои: сжимаем до 1280px JPEG, чтобы уложиться в localStorage */
function loadCustomWallpaper(file) {
  if (!file.type.startsWith('image/')) { showToast('Нужен файл изображения'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 0.8);
      S.wallCustom = data;
      S.wallpaper = 'custom';
      if (!save(KEY.settings, S)) {
        showToast('Не хватило места в хранилище', 'Выберите изображение меньшего размера');
        return;
      }
      applySettings();
      showSettingsSection(settingsSection);
    };
    img.onerror = () => showToast('Не удалось открыть изображение');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* Применяет язык ко всем статичным надписям ОС */
function applyLang() {
  const search = $('#start-search');
  if (search) search.placeholder = t('search');
  const s1 = $('#start-settings'), s2 = $('#start-lock'), s3 = $('#start-off');
  if (s1) s1.textContent = t('settings');
  if (s2) s2.textContent = t('lock');
  if (s3) s3.textContent = t('off');
  document.documentElement.lang = S.lang === 'en' ? 'en' : 'ru';
  renderQuick();
  renderPanelSliders();
  renderNotifs();
  renderCalendar();
  $('#lbl-notifs').textContent = t('notifs');
  $('#notif-clear').textContent = t('clear');
  renderStartGrid();
  renderIcons();
  renderTaskbar();
  tickClock();
}

/* Первичная подготовка подписей (до входа в систему) */
applyLang();
