/* =====================================================================
   Aether OS — Игры
   Четыре игры без стартовых экранов и меню: открываются сразу.
   Змейка (canvas), 2048 (DOM), Память (DOM), Арканоид (canvas).
   Коины начисляются по итогу партии и сохраняются в localStorage.
   ===================================================================== */

const GAME_META = [
  { id: 'snake', name: 'Змейка', reward: 'по 1 коину за очко (до 20)' },
  { id: 'g2048', name: '2048', reward: 'очки ÷ 40 (до 50), при окончании партии' },
  { id: 'memory', name: 'Память', reward: 'max(5, 40 − число ходов)' },
  { id: 'breakout', name: 'Арканоид', reward: 'очки ÷ 10 (до 40)' }
];
window.GAME_META = GAME_META;

/* Каждая игра: (stage, api) => cleanup. api: { msg(text), finish(id, name, score, coins) } */

/* ---------- Змейка ---------- */
function gameSnake(stage, api) {
  const N = 20, CELL = 20, SIZE = N * CELL;
  const cvs = document.createElement('canvas');
  cvs.width = SIZE; cvs.height = SIZE;
  stage.appendChild(cvs);
  const ctx = cvs.getContext('2d');
  let snake, dir, nextDir, food, score, alive, timer;
  const MAP = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
  };
  const spawn = () => {
    let p;
    do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (snake && snake.some(s => s.x === p.x && s.y === p.y));
    return p;
  };
  const reset = () => {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = spawn();
    score = 0;
    alive = true;
    api.msg('');
  };
  const draw = () => {
    ctx.fillStyle = '#0f1320';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#7ee787' : '#3fb950';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.fillStyle = '#e6edf3';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('Очки: ' + score, 10, 20);
  };
  const over = () => {
    alive = false;
    clearInterval(timer);
    const coins = Math.min(20, score);
    api.finish('snake', 'Змейка', score, coins);
    draw();
  };
  const step = () => {
    if (!alive) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some(s => s.x === head.x && s.y === head.y)) {
      over();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; food = spawn(); }
    else snake.pop();
    draw();
  };
  const start = () => {
    clearInterval(timer);
    reset();
    draw();
    timer = setInterval(step, 110);
  };
  const onKey = e => {
    const d = MAP[e.key];
    if (!d) return;
    e.preventDefault();
    if (!alive) { start(); return; }
    if (d[0] === -dir.x && d[1] === -dir.y) return;   // нельзя развернуться назад
    nextDir = { x: d[0], y: d[1] };
  };
  let sx = 0, sy = 0;
  const onDown = e => { sx = e.clientX; sy = e.clientY; };
  const onUp = e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    if (!alive) { start(); return; }
    if (d[0] === -dir.x && d[1] === -dir.y) return;
    nextDir = { x: d[0], y: d[1] };
  };
  cvs.addEventListener('pointerdown', onDown);
  cvs.addEventListener('pointerup', onUp);
  document.addEventListener('keydown', onKey);
  start();
  return () => {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey);
    cvs.removeEventListener('pointerdown', onDown);
    cvs.removeEventListener('pointerup', onUp);
  };
}

/* ---------- 2048 ---------- */
function game2048(stage, api) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:100%';
  stage.appendChild(wrap);
  const top = document.createElement('div');
  top.style.cssText = 'display:flex;gap:12px;align-items:center;font-size:13px';
  top.innerHTML = '<span class="sc"></span><button class="btn" data-a="new">Новая игра</button>';
  wrap.appendChild(top);
  const grid = document.createElement('div');
  grid.className = 'grid-2048';
  wrap.appendChild(grid);
  const hint = document.createElement('div');
  hint.className = 'muted';
  hint.style.fontSize = '12px';
  hint.textContent = 'Стрелки или WASD. Свайп на телефоне.';
  wrap.appendChild(hint);

  let b, score, over;
  const COLORS = ['#2a2f3d', '#eee4da', '#ede0c8', '#f2b179', '#f59563', '#f67c5f', '#f65e3b', '#edcf72', '#edcc61', '#edc850', '#edc53f', '#edc22e'];
  const addTile = () => {
    const empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!b[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  };
  const slide = line => {
    const vals = line.filter(v => v);
    let gained = 0;
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i] === vals[i + 1]) {
        vals[i] *= 2;
        gained += vals[i];
        vals.splice(i + 1, 1);
      }
    }
    while (vals.length < 4) vals.push(0);
    return { row: vals, gained };
  };
  const canMove = () => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (!b[r][c]) return true;
      if (c < 3 && b[r][c] === b[r][c + 1]) return true;
      if (r < 3 && b[r][c] === b[r + 1][c]) return true;
    }
    return false;
  };
  const render = () => {
    top.querySelector('.sc').textContent = 'Очки: ' + score;
    grid.innerHTML = b.flat().map(v => {
      const bg = v ? COLORS[Math.min(COLORS.length - 1, Math.log2(v))] : COLORS[0];
      const fg = v > 4 ? '#f9f6f2' : '#776e65';
      return `<div class="cell-2048" style="background:${bg};color:${fg};font-size:${v > 999 ? 15 : v > 99 ? 17 : 20}px">${v || ''}</div>`;
    }).join('');
  };
  const move = d => {
    if (over) return;
    let moved = false;
    for (let i = 0; i < 4; i++) {
      const idx = [0, 1, 2, 3].map(j =>
        d === 'L' ? [i, j] : d === 'R' ? [i, 3 - j] : d === 'U' ? [j, i] : [3 - j, i]);
      const res = slide(idx.map(([r, c]) => b[r][c]));
      res.row.forEach((v, j) => {
        const [r, c] = idx[j];
        if (b[r][c] !== v) moved = true;
        b[r][c] = v;
      });
      score += res.gained;
    }
    if (moved) addTile();
    render();
    if (!canMove()) {
      over = true;
      const coins = Math.min(50, Math.floor(score / 40));
      api.finish('g2048', '2048', score, coins);
    }
  };
  const newGame = () => {
    b = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    score = 0;
    over = false;
    addTile(); addTile();
    api.msg('');
    render();
  };
  const KEYS = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D' };
  const onKey = e => {
    const d = KEYS[e.key];
    if (!d) return;
    e.preventDefault();
    move(d);
  };
  let sx = 0, sy = 0;
  const onDown = e => { sx = e.clientX; sy = e.clientY; };
  const onUp = e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
  };
  grid.addEventListener('pointerdown', onDown);
  grid.addEventListener('pointerup', onUp);
  top.querySelector('[data-a="new"]').onclick = newGame;
  document.addEventListener('keydown', onKey);
  newGame();
  return () => {
    document.removeEventListener('keydown', onKey);
    grid.removeEventListener('pointerdown', onDown);
    grid.removeEventListener('pointerup', onUp);
  };
}

/* ---------- Память ---------- */
function gameMemory(stage, api) {
  const SYMBOLS = ['🍎', '🚀', '🌙', '⭐', '🐱', '🌈', '🎲', '🍀'];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px';
  stage.appendChild(wrap);
  const info = document.createElement('div');
  info.innerHTML = '<span class="mv"></span> · <button class="btn" data-a="new">Заново</button>';
  info.style.fontSize = '13px';
  wrap.appendChild(info);
  const grid = document.createElement('div');
  grid.className = 'memory-grid';
  wrap.appendChild(grid);

  let cards, open, lock, moves, matched, timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const render = () => {
    info.querySelector('.mv').textContent = 'Ходы: ' + moves;
    grid.innerHTML = cards.map((c, i) => {
      const shown = c.open || c.done;
      return `<button class="mem-card ${c.open ? 'open' : ''} ${c.done ? 'done' : ''}" data-i="${i}">${shown ? c.sym : '?'}</button>`;
    }).join('');
    $$('.mem-card', grid).forEach(b => b.onclick = () => flip(+b.dataset.i));
  };
  const flip = i => {
    const c = cards[i];
    if (lock || c.open || c.done) return;
    c.open = true;
    open.push(i);
    if (open.length === 2) {
      moves++;
      lock = true;
      const [a, b] = open.map(k => cards[k]);
      if (a.sym === b.sym) {
        a.done = b.done = true;
        matched++;
        open = [];
        lock = false;
        if (matched === SYMBOLS.length) {
          const coins = Math.max(5, 40 - moves);
          api.finish('memory', 'Память', coins, coins);
        }
      } else {
        render();
        later(() => {
          a.open = b.open = false;
          open = [];
          lock = false;
          render();
        }, 700);
        return;
      }
    }
    render();
  };
  const newGame = () => {
    timers.forEach(clearTimeout);
    timers = [];
    cards = shuffle([...SYMBOLS, ...SYMBOLS]).map(sym => ({ sym, open: false, done: false }));
    open = [];
    lock = false;
    moves = 0;
    matched = 0;
    api.msg('');
    render();
  };
  info.querySelector('[data-a="new"]').onclick = newGame;
  newGame();
  return () => timers.forEach(clearTimeout);
}

/* ---------- Арканоид ---------- */
function gameBreakout(stage, api) {
  const W = 480, H = 320, PW = 80, PH = 10, R = 6, ROWS = 5, COLS = 10, BH = 16;
  const BW = (W - 20) / COLS;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  stage.appendChild(cvs);
  const ctx = cvs.getContext('2d');
  const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7'];
  let px, bricks, bx, by, vx, vy, lives, score, timer, done;

  const serve = () => { bx = W / 2; by = H - 60; vx = (Math.random() < 0.5 ? -1 : 1) * 2.6; vy = -3.2; };
  const newGame = () => {
    px = W / 2 - PW / 2;
    bricks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      bricks.push({ x: 10 + c * BW, y: 30 + r * (BH + 6), w: BW - 4, h: BH, alive: true, color: COLORS[r] });
    }
    lives = 3; score = 0; done = false;
    serve();
    api.msg('');
    clearInterval(timer);
    timer = setInterval(update, 16);
  };
  const draw = () => {
    ctx.fillStyle = '#0f1320';
    ctx.fillRect(0, 0, W, H);
    bricks.forEach(b => { if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); } });
    ctx.fillStyle = '#e6edf3';
    ctx.fillRect(px, H - 24, PW, PH);
    ctx.beginPath();
    ctx.arc(bx, by, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`Очки: ${score}   Жизни: ${lives}`, 10, H - 6);
  };
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    const coins = Math.min(40, Math.floor(score / 10));
    api.finish('breakout', 'Арканоид', score, coins);
    draw();
  };
  function update() {
    if (done) return;
    bx += vx; by += vy;
    if (bx < R) { bx = R; vx = -vx; }
    if (bx > W - R) { bx = W - R; vx = -vx; }
    if (by < R) { by = R; vy = -vy; }
    const py = H - 24;
    if (vy > 0 && by + R >= py && by + R <= py + PH + 6 && bx >= px - R && bx <= px + PW + R) {
      const hit = (bx - (px + PW / 2)) / (PW / 2);
      vx = hit * 3.2;
      vy = -Math.abs(vy);
      by = py - R;
    }
    if (by > H) {
      lives--;
      if (lives <= 0) { draw(); finish(); return; }
      serve();
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      if (bx + R > b.x && bx - R < b.x + b.w && by + R > b.y && by - R < b.y + b.h) {
        b.alive = false;
        score += 10;
        const ox = Math.min(bx + R - b.x, b.x + b.w - (bx - R));
        const oy = Math.min(by + R - b.y, b.y + b.h - (by - R));
        if (ox < oy) vx = -vx; else vy = -vy;
        break;
      }
    }
    if (bricks.every(b => !b.alive)) { draw(); finish(); return; }
    draw();
  }
  const toCanvasX = e => (e.clientX - cvs.getBoundingClientRect().left) * (W / cvs.getBoundingClientRect().width);
  const onMove = e => { px = clamp(toCanvasX(e) - PW / 2, 0, W - PW); };
  const onKey = e => {
    if (e.key === 'ArrowLeft') { px = clamp(px - 20, 0, W - PW); e.preventDefault(); }
    if (e.key === 'ArrowRight') { px = clamp(px + 20, 0, W - PW); e.preventDefault(); }
  };
  cvs.addEventListener('pointermove', onMove);
  cvs.addEventListener('pointerdown', onMove);
  document.addEventListener('keydown', onKey);
  newGame();
  return () => {
    clearInterval(timer);
    cvs.removeEventListener('pointermove', onMove);
    cvs.removeEventListener('pointerdown', onMove);
    document.removeEventListener('keydown', onKey);
  };
}

const GAMES = {
  snake: gameSnake,
  g2048: game2048,
  memory: gameMemory,
  breakout: gameBreakout
};

/* ---------- Окно «Игры» ---------- */
registerApp({ id: 'games', name: 'Игры', icon: 'games', open: id => openGames(id) });

function openGames(startId) {
  const first = GAMES[startId] ? startId : (startId === 'coins' ? 'coins' : 'snake');
  /* Одно окно «Игры»: повторный вызов переключает вкладку в уже открытом окне */
  const open = WINS.find(w => w.appId === 'games');
  if (open) {
    activateWin(open, true);
    if (open.showGame) open.showGame(first);
    return;
  }
  openWindow({
    appId: 'games', title: 'Игры', icon: 'games', w: 640, h: 580,
    render: (body, win) => {
      body.innerHTML = `
        <div class="games">
          <div class="games-bar">
            ${GAME_META.map(g => `<button class="tab" data-g="${g.id}">${esc(g.name)}</button>`).join('')}
            <button class="tab" data-g="coins">Коины</button>
            <div class="spacer"></div>
            <span class="game-info"><span class="bal"></span></span>
          </div>
          <div class="game-stage" style="position:relative"></div>
        </div>`;
      const stage = $('.game-stage', body);
      const bal = $('.bal', body);
      const showBal = () => {
        if (!body.isConnected) return;
        bal.innerHTML = `${icon('coin')} ${coinsBalance()}`;
      };
      showBal();
      onCoins(showBal);

      let cleanup = null;
      const msgEl = () => {
        let m = $('.game-msg', stage);
        if (!m) {
          m = document.createElement('div');
          m.className = 'game-msg hidden';
          m.innerHTML = '<span></span>';
          stage.appendChild(m);
        }
        return m;
      };

      const api = {
        msg(text) {
          const m = msgEl();
          if (!text) { m.classList.add('hidden'); return; }
          $('span', m).textContent = text;
          m.classList.remove('hidden');
        },
        finish(id, name, score, coins) {
          recordGame(id, score);
          let text = `${name}: счёт ${score}`;
          if (coins > 0) {
            addCoins(coins, 'Игра: ' + name);
            text += ` · +${coins} коинов`;
            showToast('Коины начислены', `+${coins} за «${name}»`);
          }
          api.msg(text + ' — нажмите, чтобы сыграть снова');
        }
      };

      const showGame = gid => {
        if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
        $$('.tab', body).forEach(b => b.classList.toggle('on', b.dataset.g === gid));
        stage.innerHTML = '';
        if (gid === 'coins') { renderCoinsTab(stage); return; }
        cleanup = GAMES[gid](stage, api) || null;
      };

      $$('.tab', body).forEach(b => b.onclick = () => showGame(b.dataset.g));
      $('.game-stage', body).addEventListener('click', () => {
        const m = $('.game-msg', stage);
        if (m && !m.classList.contains('hidden') && m.textContent.includes('сыграть')) api.msg('');
      });
      win.onClose = () => { if (cleanup) cleanup(); };
      win.showGame = showGame;
      showGame(first);
    }
  });
}

/* Вкладка «Коины»: баланс, правила, история */
function renderCoinsTab(stage) {
  const hist = coinsState().history.slice(0, 12);
  stage.style.alignItems = 'stretch';
  stage.style.overflow = 'auto';
  stage.innerHTML = `
    <div style="width:100%;display:flex;flex-direction:column;gap:12px;font-size:13px">
      <div class="set-card" style="font-size:14px">
        <div class="hist-row"><b>Баланс</b><b style="font-size:20px;color:#ffd23f">${coinsBalance()}</b></div>
        <div class="muted" style="padding:8px 0">Коины начисляются за партии и тратятся на генерацию изображений:
          720p — 10, 1080p — 25, 1440p — 50, 4K — 100.</div>
      </div>
      <div class="set-card">
        <div style="padding:8px 0 4px"><b>Как зарабатывать</b></div>
        ${GAME_META.map(g => `<div class="hist-row"><span>${esc(g.name)}</span><span class="muted">${esc(g.reward)}</span></div>`).join('')}
      </div>
      <div class="set-card">
        <div style="padding:8px 0 4px"><b>Последние операции</b></div>
        ${hist.length ? hist.map(h => `<div class="hist-row"><span>${esc(h.r)}</span><b class="${h.d >= 0 ? 'pos' : 'neg'}">${h.d >= 0 ? '+' : ''}${h.d}</b></div>`).join('')
          : '<div class="muted">Пока пусто</div>'}
      </div>
    </div>`;
}
