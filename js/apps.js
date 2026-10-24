/* =====================================================================
   Aether OS — встроенные приложения
   Проводник, Блокнот, Терминал, Калькулятор, Монитор, просмотр изображений.
   ===================================================================== */

/* Небольшое модальное окно ввода текста внутри окна приложения */
function askText(winEl, label, value = '') {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.3);display:grid;place-items:center;z-index:5;border-radius:inherit';
    ov.innerHTML = `
      <div class="dialog glass" style="width:min(340px,88%);background:var(--surface)">
        <div class="dialog-title">${esc(label)}</div>
        <input class="input" value="${esc(value)}">
        <div class="dialog-btns" style="margin-top:12px">
          <button class="btn ghost" data-a="0">Отмена</button>
          <button class="btn primary" data-a="1">OK</button>
        </div>
      </div>`;
    winEl.appendChild(ov);
    const inp = $('input', ov);
    inp.focus();
    inp.select();
    const done = ok => { ov.remove(); resolve(ok ? inp.value.trim() : null); };
    $('[data-a="0"]', ov).onclick = () => done(false);
    $('[data-a="1"]', ov).onclick = () => done(true);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
  });
}

function joinPath(dir, name) { return normPath(dir + '/' + name); }

/* ---------- Проводник ---------- */
registerApp({ id: 'files', name: 'Проводник', icon: 'folder', open: p => openFiles(p) });

function openFiles(start = '/home') {
  openWindow({
    appId: 'files', title: 'Проводник', icon: 'folder', w: 760, h: 480,
    render: (body, win) => {
      let cur = fsIsDir(start) ? start : '/home';
      let sel = null;
      body.innerHTML = `
        <div class="app">
          <div class="toolbar">
            <button class="icon-btn" data-a="up" title="Вверх">${icon('left')}</button>
            <div class="crumbs" style="flex:1"></div>
            <button class="btn" data-a="newdir">${icon('plus')} Папка</button>
            <button class="btn" data-a="newfile">${icon('plus')} Файл</button>
            <button class="btn" data-a="ren">Переименовать</button>
            <button class="btn danger" data-a="del">Удалить</button>
          </div>
          <div class="fm-grid" style="flex:1;overflow:auto;align-content:start"></div>
        </div>`;
      const grid = $('.fm-grid', body);
      const crumbs = $('.crumbs', body);

      const render = () => {
        crumbs.textContent = cur;
        const items = fsList(cur);
        grid.innerHTML = items.length
          ? items.map(it => `
              <button class="fm-item" data-p="${esc(it.path)}"
                style="${sel === it.path ? 'background:var(--line)' : ''}">
                ${icon(it.dir ? 'folder' : 'file', 'lg')}<span>${esc(it.name)}</span>
              </button>`).join('')
          : '<div class="muted" style="padding:20px">Папка пуста</div>';
        $$('.fm-item', grid).forEach(b => {
          const p = b.dataset.p;
          b.onclick = e => { e.stopPropagation(); sel = p; render(); };
          b.ondblclick = () => {
            if (fsIsDir(p)) { cur = p; sel = null; render(); }
            else openFile(p);
          };
          b.oncontextmenu = e => {
            e.preventDefault();
            sel = p; render();
            showCtx(e.clientX, e.clientY, [
              { label: 'Открыть', icon: 'file', fn: () => (fsIsDir(p) ? (cur = p, render()) : openFile(p)) },
              { label: 'Переименовать', icon: 'edit', fn: () => doRename() },
              { label: 'Удалить', icon: 'trash', fn: () => doDelete() }
            ]);
          };
        });
      };

      const doRename = async () => {
        if (!sel) return;
        const name = await askText(win.el, 'Новое имя', fsName(sel));
        if (!name) return;
        if (!fsMove(sel, joinPath(fsParent(sel), name))) showToast('Не удалось переименовать');
        sel = null; render();
      };
      const doDelete = async () => {
        if (!sel) return;
        const ok = await showDialog({ title: 'Удалить?', text: sel, yes: 'Удалить', no: 'Отмена' });
        if (ok) { fsDelete(sel); sel = null; render(); }
      };

      $('[data-a="up"]', body).onclick = () => { cur = fsParent(cur); sel = null; render(); };
      $('[data-a="newdir"]', body).onclick = async () => {
        const name = await askText(win.el, 'Имя папки', 'Новая папка');
        if (!name) return;
        if (!fsMkdir(joinPath(cur, name))) showToast('Не удалось создать папку');
        render();
      };
      $('[data-a="newfile"]', body).onclick = async () => {
        const name = await askText(win.el, 'Имя файла', 'Новый документ.txt');
        if (!name) return;
        const p = joinPath(cur, name);
        if (!fsExists(p)) fsWrite(p, '');
        openFile(p);
        render();
      };
      $('[data-a="ren"]', body).onclick = doRename;
      $('[data-a="del"]', body).onclick = doDelete;
      grid.addEventListener('click', () => { sel = null; render(); });
      render();
    }
  });
}

/* ---------- Блокнот ---------- */
registerApp({ id: 'editor', name: 'Блокнот', icon: 'edit', open: p => openEditor(p) });

function openEditor(path) {
  openWindow({
    appId: 'editor', title: 'Блокнот', icon: 'edit', w: 640, h: 460,
    render: (body, win) => {
      body.innerHTML = `
        <div class="app">
          <div class="toolbar">
            <input class="input" data-a="name" placeholder="Путь файла">
            <button class="btn primary" data-a="save">Сохранить</button>
          </div>
          <textarea class="editor" spellcheck="false"></textarea>
          <div class="status"></div>
        </div>`;
      const ta = $('textarea', body), nm = $('[data-a="name"]', body), st = $('.status', body);
      let p = '';
      let dirty = false;

      const open = np => {
        p = np;
        nm.value = np;
        const c = fsRead(np);
        ta.value = c == null ? '' : c;
        dirty = false;
        win.setTitle('Блокнот — ' + fsName(np));
        st.textContent = c == null ? 'Новый файл (ещё не сохранён)' : 'Открыт файл';
      };
      const save = () => {
        const np = normPath(nm.value || p);
        if (!fsWrite(np, ta.value)) {
          showDialog({ title: 'Ошибка', text: 'Папка для файла не существует.', yes: 'OK' });
          return;
        }
        p = np;
        dirty = false;
        win.setTitle('Блокнот — ' + fsName(np));
        st.textContent = 'Сохранено ' + fmtTime();
      };

      ta.addEventListener('input', () => { dirty = true; st.textContent = 'Изменено · не сохранено'; });
      ta.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      });
      $('[data-a="save"]', body).onclick = save;
      win.onClose = null;
      open(path && fsExists(path) && !fsIsDir(path) ? path : '/home/Documents/Без названия.txt');
      win.dirty = () => dirty;
    }
  });
}

/* ---------- Просмотр изображений ---------- */
registerApp({ id: 'viewer', name: 'Просмотр', icon: 'image', desktop: false, open: p => openImage(p) });

function openImage(path) {
  const data = path ? fsRead(path) : null;
  openWindow({
    appId: 'viewer', title: path ? fsName(path) : 'Просмотр', icon: 'image', w: 640, h: 480,
    render: body => {
      body.innerHTML = `<div class="gallery">${data && String(data).startsWith('data:image')
        ? `<img src="${data}" alt="">`
        : '<div class="muted">Выберите изображение в Проводнике или создайте его в ИИ-генераторе</div>'}</div>`;
    }
  });
}

/* Открывает файл: изображения — в просмотре, остальное — в блокноте */
function openFile(path) {
  if (/\.(png|jpe?g|gif|webp)$/i.test(fsName(path))) return openImage(path);
  return openEditor(path);
}

/* ---------- Терминал ---------- */
registerApp({ id: 'terminal', name: 'Терминал', icon: 'term', open: () => openTerminal() });

function openTerminal() {
  openWindow({
    appId: 'terminal', title: 'Терминал', icon: 'term', w: 640, h: 400, glass: false,
    render: body => {
      body.innerHTML = `
        <div class="app" style="height:100%">
          <div class="term"></div>
          <div class="term-in" style="padding:8px 12px;background:#0d1017">
            <span class="prompt"></span><input spellcheck="false" autocomplete="off">
          </div>
        </div>`;
      const term = $('.term', body), inp = $('input', body), prompt = $('.prompt', body);
      let cwd = '/home';
      const hist = [];
      let hi = -1;

      const out = txt => { term.textContent += txt + '\n'; term.scrollTop = term.scrollHeight; };
      const updPrompt = () => { prompt.textContent = `aether:${cwd}$`; };
      const resolve = p => (p && p.startsWith('/') ? normPath(p) : normPath(cwd + '/' + (p || '')));

      const run = line => {
        const parts = line.trim().split(/\s+/);
        const cmd = parts[0], a = parts.slice(1).join(' ');
        switch (cmd) {
          case '': break;
          case 'help':
            out('help, ls [путь], cd <путь>, pwd, cat <файл>, echo <текст> [> файл],\n' +
                'mkdir <имя>, touch <имя>, rm <путь>, clear, date, whoami, uname,\n' +
                'coins, games, gen, open <приложение>');
            break;
          case 'pwd': out(cwd); break;
          case 'ls': {
            const dir = resolve(a);
            if (!fsIsDir(dir)) { out('ls: нет такой папки'); break; }
            out(fsList(dir).map(i => i.name + (i.dir ? '/' : '')).join('   ') || '(пусто)');
            break;
          }
          case 'cd': {
            const dir = resolve(a || '/home');
            if (!fsIsDir(dir)) { out('cd: нет такой папки'); break; }
            cwd = dir; updPrompt();
            break;
          }
          case 'cat': {
            const c = fsRead(resolve(a));
            out(c == null ? `cat: нет такого файла: ${a}` : c);
            break;
          }
          case 'echo': {
            const m = a.match(/^(.*?)\s*>\s*(\S+)$/);
            if (m) { if (!fsWrite(resolve(m[2]), m[1] + '\n')) out('ошибка записи'); }
            else out(a);
            break;
          }
          case 'mkdir': if (!fsMkdir(resolve(a))) out('mkdir: не удалось'); break;
          case 'touch': { const p = resolve(a); if (!fsExists(p) && !fsWrite(p, '')) out('touch: не удалось'); break; }
          case 'rm': {
            const p = resolve(a);
            if (p === '/' || !fsExists(p)) { out(`rm: нельзя удалить: ${a}`); break; }
            fsDelete(p);
            break;
          }
          case 'clear': term.textContent = ''; break;
          case 'date': out(new Date().toString()); break;
          case 'whoami': out(S.userName); break;
          case 'uname': out('Aether OS 1.0 (web)'); break;
          case 'coins': out(`Баланс: ${coinsBalance()} коинов`); break;
          case 'games': out((window.GAME_META || []).map(g => g.name).join(', ') || 'нет игр'); break;
          case 'gen': openApp('ai'); break;
          case 'open': {
            const ok = APPS.some(x => x.id === a);
            if (ok) openApp(a); else out(`open: нет приложения «${a}». Доступно: ${APPS.map(x => x.id).join(', ')}`);
            break;
          }
          default: out(`${cmd}: команда не найдена (help — список команд)`);
        }
      };

      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const line = inp.value;
          out(`${prompt.textContent} ${line}`);
          if (line.trim()) hist.unshift(line);
          hi = -1;
          inp.value = '';
          run(line);
        } else if (e.key === 'ArrowUp') {
          if (hist.length && hi < hist.length - 1) inp.value = hist[++hi];
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          hi = Math.max(-1, hi - 1);
          inp.value = hi >= 0 ? hist[hi] : '';
          e.preventDefault();
        }
      });
      body.addEventListener('click', () => inp.focus());
      out('Aether OS terminal. Введите help.');
      updPrompt();
      setTimeout(() => inp.focus(), 30);
    }
  });
}

/* ---------- Калькулятор ---------- */
registerApp({ id: 'calc', name: 'Калькулятор', icon: 'calc', open: () => openCalc() });

/* Безопасный вычислитель: + - * / % скобки, без eval */
function calcEval(src) {
  const clean = src.replace(/\s+/g, '');
  const tokens = clean.match(/\d*\.?\d+|[()+\-*/%]/g);
  if (!tokens || tokens.join('') !== clean) throw new Error('bad');
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = next(); const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function term() {
    let v = factor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next(); const r = factor();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function factor() {
    const tk = next();
    if (tk === '-') return -factor();
    if (tk === '(') { const v = expr(); if (next() !== ')') throw new Error('paren'); return v; }
    const n = Number(tk);
    if (Number.isNaN(n)) throw new Error('num');
    return n;
  }
  const v = expr();
  if (i !== tokens.length) throw new Error('extra');
  return v;
}

function openCalc() {
  openWindow({
    appId: 'calc', title: 'Калькулятор', icon: 'calc', w: 300, h: 420, singleton: true,
    render: body => {
      body.innerHTML = `
        <div class="calc">
          <div class="calc-screen" data-s="expr">0</div>
          <div class="calc-keys">
            ${['C', '⌫', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '(', ')']
              .map(k => `<button class="btn" data-k="${esc(k)}">${esc(k)}</button>`).join('')}
            <button class="btn primary" data-k="=" style="grid-column:span 4">=</button>
          </div>
        </div>`;
      const screen = $('[data-s="expr"]', body);
      let expr = '';
      const show = () => { screen.textContent = expr || '0'; };
      $$('[data-k]', body).forEach(b => b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'C') expr = '';
        else if (k === '⌫') expr = expr.slice(0, -1);
        else if (k === '=') {
          try {
            const v = calcEval(expr);
            expr = Number.isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : '';
            if (!expr) screen.textContent = 'Ошибка';
          } catch (e) { screen.textContent = 'Ошибка'; expr = ''; return; }
        } else expr += k;
        show();
      });
      show();
    }
  });
}

/* ---------- Монитор системы (симуляция + реальный объём localStorage) ---------- */
registerApp({ id: 'monitor', name: 'Монитор', icon: 'monitor', open: () => openMonitor() });

function openMonitor() {
  openWindow({
    appId: 'monitor', title: 'Монитор', icon: 'monitor', w: 520, h: 400, singleton: true,
    render: (body, win) => {
      body.innerHTML = `
        <div class="sysmon">
          <div>Процессор (симуляция) <span class="cpu-v muted"></span></div><div class="meter"><div class="cpu"></div></div>
          <div>Память (симуляция) <span class="mem-v muted"></span></div><div class="meter"><div class="mem"></div></div>
          <div>Сеть (симуляция) <span class="net-v muted"></span></div><div class="meter"><div class="net"></div></div>
          <div>Хранилище браузера <span class="ls-v muted"></span></div><div class="meter"><div class="ls"></div></div>
          <div class="muted">Виртуальный диск: ${fsList('/').length} объектов в корне</div>
        </div>`;
      let cpu = 22, mem = 40;
      const set = (sel, v) => { $(sel, body).style.width = v + '%'; };
      const tick = () => {
        cpu = clamp(cpu + (Math.random() - 0.5) * 18, 4, 96);
        mem = clamp(mem + (Math.random() - 0.5) * 4, 25, 85);
        const net = S.wifi && !S.airplane ? Math.random() * 60 : 0;
        let bytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
        }
        const pct = clamp(bytes / (5 * 1024 * 1024) * 100, 0, 100);
        set('.cpu', cpu.toFixed(0)); set('.mem', mem.toFixed(0)); set('.net', net.toFixed(0)); set('.ls', pct.toFixed(1));
        $('.cpu-v', body).textContent = cpu.toFixed(0) + '%';
        $('.mem-v', body).textContent = mem.toFixed(0) + '%';
        $('.net-v', body).textContent = net.toFixed(0) + ' Кбит/с';
        $('.ls-v', body).textContent = (bytes / 1024).toFixed(1) + ' КБ из ~5 МБ';
      };
      tick();
      const iv = setInterval(tick, 1000);
      win.onClose = () => clearInterval(iv);
    }
  });
}
