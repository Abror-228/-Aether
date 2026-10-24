/* =====================================================================
   Aether OS — ИИ-генератор изображений (только JavaScript, без сервера)

   ЧЕСТНО О ВОЗМОЖНОСТЯХ
   Это не нейросеть. Генератор разбирает слова запроса (русские и английские)
   и собирает сцену из процедурных фигур, градиентов, теней и шума.
   Он понимает отдельные слова: объекты, количество, положение, размер,
   время суток, погоду и цвета. Смысл фраз и связи между объектами
   он не понимает. Слова, которые не распознал, выводятся в интерфейсе
   под картинкой, чтобы было видно, что проигнорировано.

   ОБЪЕКТЫ (слова в запросе, с учётом окончаний)
     небо / sky                      — градиент неба (цвет: «синее небо»)
     облака / облако / туча          — облака
     солнце / sun                    — солнце с ореолом (также на закате)
     луна / месяц / moon             — луна (ночью рисуется сама)
     звёзды / звезда / star          — звёздное поле
     радуга / rainbow                — радуга над горизонтом
     горы / гора / mountain          — два слоя гор, снег при погоде «снег»
     холмы / холм / hill             — пологие холмы
     море / океан / озеро / sea      — вода с отражением солнца и волнами
     река / реки / river             — извилистая река на равнине
     трава / луг / grass             — пучки травы на переднем плане
     дом / домик / house             — дом с крышей, окнами и дверью
     замок / castle                  — башни с зубцами
     дерево / дерева / tree          — лиственное дерево с кроной
     ель / ели / fir / pine          — ель (треугольные ярусы)
     пальма / palm                   — пальма с листьями
     лес / forest                    — группа деревьев (по умолчанию 3)
     цветы / цветок / flower         — цветы на стеблях
     гриб / грибы / mushroom         — гриб с пятнами
     фонарь / lamp                   — фонарь (ночью светится)
     город / здание / city           — силуэт города с окнами
     машина / автомобиль / car       — машина с колёсами
     дорога / road                   — дорога с разметкой
     кот / кошка / cat               — сидящий кот (силуэт)
     собака / dog                    — сидящая собака (силуэт)
     птица / птицы / bird            — птица в небе
     самолёт / plane                 — самолёт в небе
     ракета / rocket                 — ракета с пламенем
     рыба / fish                     — рыбы в море
     лодка / корабль / boat          — лодка на воде
     огонь / костер / fire           — пламя

   КОЛИЧЕСТВО: «два дерева», «3 дома», «несколько деревьев» (несколько = 3).
   ПОЛОЖЕНИЕ: «слева», «справа», «в центре», «вдали», «на переднем плане»
              (относится к ближайшему объекту).
   РАЗМЕР: «большой», «огромный», «маленький», «крошечный».
   ВРЕМЯ СУТОК: день; утро / рассвет; закат / вечер; ночь / ночной.
   ПОГОДА: дождь / rain, снег / snow, облачно / cloudy.
   ЦВЕТА: красный, оранжевый, жёлтый, зелёный, синий / голубой, фиолетовый,
          розовый, чёрный, белый, серый, коричневый (и английские названия).
          Цвет привязывается к ближайшему объекту: «красный дом», «синее небо».

   НЕ РИСУЕТСЯ
   Люди и животные, кроме кота, собаки и птицы; текст; конкретные марки и
   породы; сложные предметы; всё, что не из списка. Такие слова попадают
   в список «Не поняты». Если ни одного объекта не распознано, рисуется
   абстрактная композиция в палитре из цветов запроса (или времени суток),
   и генератор сообщает об этом.

   КАЧЕСТВО И ЦЕНА (коины):
     720p — 10, 1080p — 25, 1440p — 50, 4K — 100.
   Сцена рисуется в логической системе 1280×720 и масштабируется, поэтому
   одинаковый seed даёт одну композицию в любом разрешении.
   ===================================================================== */

const AI_W = 1280, AI_H = 720;
const AI_GROUND = Math.round(AI_H * 0.66);
const AI_RES = {
  '720p': { w: 1280, h: 720, cost: 10, label: '720p' },
  '1080p': { w: 1920, h: 1080, cost: 25, label: '1080p' },
  '1440p': { w: 2560, h: 1440, cost: 50, label: '1440p' },
  '4K': { w: 3840, h: 2160, cost: 100, label: '4K' }
};
const AI_OBJ_RU = {
  sky: 'небо', clouds: 'облака', sun: 'солнце', moon: 'луна', stars: 'звёзды', rainbow: 'радуга',
  mountains: 'горы', hills: 'холмы', sea: 'море', river: 'река', grass: 'трава', house: 'дом',
  castle: 'замок', tree: 'дерево', fir: 'ель', palm: 'пальма', forest: 'лес', flowers: 'цветы',
  mushroom: 'гриб', lamp: 'фонарь', city: 'город', car: 'машина', road: 'дорога', cat: 'кот',
  dog: 'собака', bird: 'птица', plane: 'самолёт', rocket: 'ракета', fish: 'рыба', boat: 'лодка',
  fire: 'огонь'
};
/* Объекты, которые стоят на земле (переднего плана) */
const AI_GROUND_KEYS = ['house', 'castle', 'tree', 'fir', 'palm', 'forest', 'flowers', 'mushroom', 'lamp',
  'car', 'cat', 'dog', 'fire', 'rocket'];
/* Объекты в небе */
const AI_SKY_KEYS = ['bird', 'plane'];
/* Базовый масштаб каждого объекта */
const AI_BASE_SCALE = {
  house: 1.1, castle: 1.0, tree: 1.1, fir: 1.2, palm: 1.1, forest: 1.0, flowers: 1.0, mushroom: 1.0,
  lamp: 1.2, car: 1.0, cat: 1.1, dog: 1.1, fire: 1.0, rocket: 1.0, bird: 1.3, plane: 1.0
};
const AI_NUM = {
  один: 1, одна: 1, одно: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6,
  несколько: 3, one: 1, two: 2, three: 3, four: 4, five: 5, several: 3
};
/* Слова-связки и служебные: их не считаем «непонятными» */
const AI_STOP = new Set(('и а но или в во на с со за над под у к ко по из от до для без о об при это как где там тут ' +
  'плане фоне фон заднем пейзаж вид пейзажа ' +
  'рядом между около возле внутри перед после очень красивый красивая красивое красивые реалистичный ' +
  'картинка картина изображение сцена сцену нарисуй нарисовать сделай создай покажи мне пожалуйста ' +
  'много немного все вокруг есть the and with of in on at to draw make picture image scene is some nice beautiful').split(' '));

/* Таблицы: регулярные выражения сравниваются с целым словом (токеном) */
const AI_TABLES = {
  obj: {
    sky: /^неб(о|а|е|у|ом)$|^sky$/,
    clouds: /^облак|^облач|^туч|^cloud/,
    sun: /^солн|^sun$/,
    moon: /^лун|^месяц|^moon/,
    stars: /^звезд|^звёз|^star/,
    rainbow: /^радуг|^rainbow/,
    mountains: /^горн|^гор(ы|а|ах|ам|ами|е|у)$|^mountain/,
    hills: /^холм|^hill/,
    sea: /^мор(е|я|ем|ю)$|^океан|^ocean|^sea$|^озер|^lake/,
    river: /^рек(а|и|е|у)$|^river/,
    grass: /^трав|^grass|^луг|^meadow/,
    house: /^дом(ик|а|ом|е|ы|ов|ам)?$|^house|^хижин|^коттедж/,
    castle: /^замок|^замк|^castle/,
    tree: /^дерев|^tree/,
    fir: /^ель$|^ели$|^елей$|^елк|^fir$|^spruce$|^pine$/,
    palm: /^пальм|^palm/,
    forest: /^лес(а|е|ок)?$|^forest/,
    flowers: /^цвет(ы|ок|ов|ка|ки)$|^flower|^роз(а|ы)$|^ромашк/,
    mushroom: /^гриб|^mushroom/,
    lamp: /^фонар|^lamp|^lantern/,
    city: /^город|^city|^здани|^небоскреб|^urban/,
    car: /^машин|^автомоб|^car$|^авто$/,
    road: /^дорог|^road/,
    cat: /^кот(ы|ик|ов|ом|а)?$|^кошк|^cat$/,
    dog: /^собак|^пес$|^dog$/,
    bird: /^птиц|^птах|^bird/,
    plane: /^самолет|^plane|^airplane/,
    rocket: /^ракет|^rocket/,
    fish: /^рыб|^fish/,
    boat: /^лодк|^корабл|^boat|^яхт/,
    fire: /^огон|^костер|^fire$|^пламя/
  },
  time: {
    night: /^ноч|^night/,
    sunset: /^закат|^вечер|^sunset|^сумерк/,
    morning: /^утр|^рассвет|^morning|^dawn/,
    day: /^день$|^дн[еёя]м?$|^дневн|^day$|^sunny/
  },
  weather: {
    rain: /^дожд|^rain/,
    snow: /^снег|^snow/,
    cloudy: /^облачн|^cloudy|^пасмурн/
  },
  color: {
    red: /^красн|^red|^алы|^бордов/,
    orange: /^оранж|^orange/,
    yellow: /^желт|^yellow|^золот|^gold/,
    green: /^зелен|^green|^изумруд/,
    blue: /^син|^голуб|^blue|^лазур/,
    purple: /^фиолет|^сирен|^purple|^violet/,
    pink: /^розов|^pink/,
    black: /^черн|^black/,
    white: /^бел(ый|ая|ое|ые|ого|ом)?$|^white/,
    gray: /^сер(ый|ая|ое|ые|ого)$|^gray$|^grey$|^сереб/,
    brown: /^коричн|^brown/
  },
  pos: {
    left: /^слев|^left/,
    right: /^справ|^right/,
    center: /^центр|^center|^middle/,
    far: /^вдал|^далек|^дальн|^far/,
    near: /^переди|^передн|^близ|^near|^front|^foreground/
  },
  size: {
    big: /^больш|^огромн|^громадн|^высок|^large|^big|^huge/,
    small: /^маленьк|^мелк|^крошечн|^small|^tiny|^little/
  }
};
const AI_COLOR_HEX = {
  red: '#e5484d', orange: '#f76b15', yellow: '#ffd43b', green: '#30a46c', blue: '#3b82f6',
  purple: '#8b5cf6', pink: '#f472b6', black: '#1f2430', white: '#f4f6fa', gray: '#8a9099', brown: '#8b5a2b'
};
const AI_TIME_SKY = {
  day: ['#4f9ef0', '#cfe9ff'],
  morning: ['#7fb7ff', '#ffd9b0'],
  sunset: ['#2a2f6b', '#ffb46b'],
  night: ['#050816', '#1c2a55']
};

/* ---------- Разбор запроса ---------- */
function aiNumAt(tokens, j) {
  if (j < 0 || j >= tokens.length) return null;
  const tk = tokens[j];
  if (AI_NUM[tk]) return AI_NUM[tk];
  if (/^\d{1,2}$/.test(tk) && +tk > 0) return +tk;
  return null;
}
/* Ищет слово из таблицы рядом с объектом: сначала до него, потом после */
function aiTagNear(tokens, i, table) {
  for (const d of [-1, 1, -2, 2]) {
    const j = i + d;
    if (j < 0 || j >= tokens.length) continue;
    for (const k of Object.keys(table)) {
      if (table[k].test(tokens[j])) return k;
    }
  }
  return null;
}

function aiParse(prompt) {
  const text = String(prompt || '').toLowerCase().replace(/ё/g, 'е');
  const tokens = text.split(/[^a-zа-я0-9]+/).filter(Boolean);

  /* Каждый токен сопоставляем с первой подходящей таблицей */
  const found = [];
  tokens.forEach((tk, i) => {
    for (const kind of Object.keys(AI_TABLES)) {
      for (const key of Object.keys(AI_TABLES[kind])) {
        if (AI_TABLES[kind][key].test(tk)) { found.push({ kind, key, i }); return; }
      }
    }
  });

  /* Вхождения объектов: каждое упоминание — отдельный экземпляр с количеством и положением */
  const occ = [];
  found.forEach(f => {
    if (f.kind !== 'obj') return;
    let count = aiNumAt(tokens, f.i - 1) || aiNumAt(tokens, f.i - 2) || 1;
    if (f.key === 'forest' && count === 1 && !aiNumAt(tokens, f.i - 1)) count = 3;
    occ.push({
      key: f.key, i: f.i,
      count: Math.min(6, Math.max(1, count)),
      pos: aiTagNear(tokens, f.i, AI_TABLES.pos),
      size: aiTagNear(tokens, f.i, AI_TABLES.size),
      color: null
    });
  });

  /* Цвет привязываем к ближайшему объекту: сначала следующий, иначе предыдущий */
  let skyColor = null, globalColor = null;
  found.filter(f => f.kind === 'color').forEach(cf => {
    const hex = AI_COLOR_HEX[cf.key];
    const target = occ.find(o => o.i > cf.i) || [...occ].reverse().find(o => o.i < cf.i);
    if (!target) { if (!globalColor) globalColor = hex; return; }
    if (target.key === 'sky') skyColor = hex;
    else if (!target.color) target.color = hex;
  });

  /* Непонятые слова: не попали ни в одну таблицу и не служебные */
  const known = new Set(found.map(f => f.i));
  const unknown = [];
  tokens.forEach((tk, i) => {
    if (known.has(i) || AI_NUM[tk] || /^\d+$/.test(tk) || AI_STOP.has(tk) || tk.length < 3) return;
    if (!unknown.includes(tk)) unknown.push(tk);
  });

  const timeF = found.find(f => f.kind === 'time');
  const weatherF = found.find(f => f.kind === 'weather');
  const objects = [];
  occ.forEach(o => { if (!objects.includes(o.key)) objects.push(o.key); });
  return {
    objects,                          // уникальные объекты (для фонов и палитры)
    occ,                              // все упоминания объектов с количеством/положением/цветом
    skyColor,
    globalColor,
    time: timeF ? timeF.key : 'day',
    weather: weatherF ? weatherF.key : 'clear',
    unknown: unknown.slice(0, 8)
  };
}

/* ---------- Цвет и генератор случайных чисел ---------- */
function aiHex(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
}
function aiToHex(rgb) {
  return '#' + rgb.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function aiMix(a, b, t) {
  const A = aiHex(a), B = aiHex(b);
  return aiToHex(A.map((v, i) => v + (B[i] - v) * t));
}
function aiShade(hex, f) {
  return f >= 0 ? aiMix(hex, '#ffffff', f) : aiMix(hex, '#000000', -f);
}
function aiAlpha(hex, a) {
  return `rgba(${aiHex(hex).join(',')},${a})`;
}
/* Детерминированный ГПСЧ (mulberry32): одинаковый seed — одинаковая картинка */
function aiRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function aiHash(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------- Примитивы рисования (логические координаты 1280×720) ---------- */
function aiRR(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function aiShadow(c, x, y, w, h) {
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.beginPath();
  c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  c.fill();
}
function aiSky(c, time, tint, dark) {
  const [top, bottom] = AI_TIME_SKY[time] || AI_TIME_SKY.day;
  let t = top, b = bottom;
  if (tint) { t = aiMix(top, tint, 0.45); b = aiMix(bottom, tint, 0.3); }
  if (dark) { t = aiShade(t, -0.3); b = aiShade(b, -0.2); }
  const g = c.createLinearGradient(0, 0, 0, AI_GROUND);
  g.addColorStop(0, t);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(0, 0, AI_W, AI_H);
  if (time === 'sunset' || time === 'morning') {
    const glow = c.createRadialGradient(AI_W * 0.75, AI_GROUND, 10, AI_W * 0.75, AI_GROUND, 620);
    glow.addColorStop(0, aiAlpha('#ffd08a', 0.45));
    glow.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, AI_W, AI_H);
  }
}
function aiStars(c, rng, n) {
  for (let i = 0; i < n; i++) {
    const x = rng() * AI_W, y = rng() * AI_GROUND * 0.8;
    const r = rng() * 1.6 + 0.3;
    c.fillStyle = `rgba(255,255,255,${0.35 + rng() * 0.65})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}
function aiSun(c, x, y, r, col) {
  const glow = c.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
  glow.addColorStop(0, aiAlpha(col, 0.55));
  glow.addColorStop(1, aiAlpha(col, 0));
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, r * 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function aiMoon(c, x, y, r) {
  const glow = c.createRadialGradient(x, y, r, x, y, r * 4);
  glow.addColorStop(0, 'rgba(220,230,255,.35)');
  glow.addColorStop(1, 'rgba(220,230,255,0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, r * 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#eef2fb';
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  /* Полумесяц: затеняем часть диска цветом неба */
  c.fillStyle = 'rgba(12,18,40,.75)';
  c.beginPath();
  c.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
  c.fill();
}
function aiCloud(c, x, y, s, alpha, dark) {
  c.fillStyle = dark ? `rgba(70,80,100,${alpha})` : `rgba(255,255,255,${alpha})`;
  [[0, 0, 40], [-40, 8, 30], [40, 8, 34], [18, -18, 32]].forEach(([dx, dy, r]) => {
    c.beginPath();
    c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    c.fill();
  });
}
function aiRainbow(c, cx, cy) {
  const cols = ['#ff4d4d', '#ffa64d', '#ffe14d', '#4dff88', '#4da6ff', '#a64dff'];
  cols.forEach((col, i) => {
    c.strokeStyle = aiAlpha(col, 0.55);
    c.lineWidth = 12;
    c.beginPath();
    c.arc(cx, cy, 340 - i * 12, Math.PI, 0);
    c.stroke();
  });
}
function aiMountains(c, rng, baseY, height, col, snow) {
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  const pts = [];
  for (let x = -40; x <= AI_W + 40; x += 20) {
    const n = 0.5 + 0.25 * Math.sin(x * 0.011 + ph[0]) + 0.18 * Math.sin(x * 0.027 + ph[1]) + 0.07 * Math.sin(x * 0.07 + ph[2]);
    pts.push([x, baseY - height * Math.max(0.05, n)]);
  }
  const g = c.createLinearGradient(0, baseY - height, 0, baseY);
  g.addColorStop(0, col);
  g.addColorStop(1, aiShade(col, -0.35));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(pts[0][0], AI_H);
  pts.forEach(p => c.lineTo(p[0], p[1]));
  c.lineTo(AI_W, AI_H);
  c.closePath();
  c.fill();
  if (snow) {
    c.fillStyle = 'rgba(255,255,255,.88)';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      if (y < pts[i - 1][1] && y < pts[i + 1][1] && y < baseY - height * 0.6) {
        c.beginPath();
        c.moveTo(x - 24, y + 28);
        c.lineTo(x, y);
        c.lineTo(x + 24, y + 28);
        c.closePath();
        c.fill();
      }
    }
  }
}
function aiHills(c, rng, baseY, col) {
  c.fillStyle = col;
  for (let i = -1; i < 7; i++) {
    const x = i * 220 + rng() * 80;
    const r = 120 + rng() * 90;
    c.beginPath();
    c.ellipse(x, baseY, r, 60 + rng() * 40, 0, Math.PI, 0);
    c.fill();
  }
}
function aiGrass(c, horizon, col) {
  const g = c.createLinearGradient(0, horizon, 0, AI_H);
  g.addColorStop(0, aiShade(col, 0.1));
  g.addColorStop(1, aiShade(col, -0.35));
  c.fillStyle = g;
  c.fillRect(0, horizon, AI_W, AI_H - horizon);
}
/* Пучки травы на переднем плане (ключ «трава») */
function aiGrassTufts(c, rng, col) {
  c.strokeStyle = aiShade(col, -0.2);
  c.lineWidth = 2;
  for (let i = 0; i < 160; i++) {
    const x = rng() * AI_W;
    const y = AI_GROUND + 20 + rng() * (AI_H - AI_GROUND - 20);
    const h = 8 + rng() * 14;
    for (let k = -1; k <= 1; k++) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + k * 4 + (rng() - 0.5) * 3, y - h);
      c.stroke();
    }
  }
}
function aiSea(c, rng, horizon, col, time, sunX) {
  const g = c.createLinearGradient(0, horizon, 0, AI_H);
  g.addColorStop(0, aiShade(col, 0.15));
  g.addColorStop(1, aiShade(col, -0.45));
  c.fillStyle = g;
  c.fillRect(0, horizon, AI_W, AI_H - horizon);
  if (time !== 'night') {
    c.fillStyle = 'rgba(255,230,160,.32)';
    for (let i = 0; i < 12; i++) {
      const y = horizon + 14 + i * ((AI_H - horizon) / 14);
      const w = (80 - i * 4) * (1 + i * 0.06);
      c.fillRect(sunX - w / 2, y, w, 4);
    }
  }
  c.strokeStyle = 'rgba(255,255,255,.12)';
  c.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = horizon + (i + 1) * ((AI_H - horizon) / 15);
    c.beginPath();
    for (let x = 0; x <= AI_W; x += 20) c.lineTo(x, y + Math.sin(x * 0.03 + i * 1.3) * 2.5);
    c.stroke();
  }
}
/* Река: извилистая полоса от горизонта до низа кадра */
function aiRiver(c, col, phase) {
  const water = col || '#2a7fc0';
  const pts = [];
  for (let y = AI_GROUND + 4; y <= AI_H; y += 8) {
    const t = (y - AI_GROUND) / (AI_H - AI_GROUND);
    const cx = AI_W * 0.45 + Math.sin(y * 0.02 + phase) * 90 * t;
    const w = 6 + t * 90;
    pts.push([cx, y, w]);
  }
  const g = c.createLinearGradient(0, AI_GROUND, 0, AI_H);
  g.addColorStop(0, aiShade(water, 0.2));
  g.addColorStop(1, aiShade(water, -0.2));
  c.fillStyle = g;
  c.beginPath();
  pts.forEach(([x, y, w]) => c.lineTo(x - w / 2, y));
  for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]);
  c.closePath();
  c.fill();
}
function aiCity(c, rng, baseY, night, col) {
  let x = 0;
  while (x < AI_W) {
    const w = 50 + rng() * 70;
    const h = 110 + rng() * 230;
    c.fillStyle = aiShade(col, -0.1 + rng() * 0.12);
    c.fillRect(x, baseY - h, w, h);
    for (let wy = baseY - h + 14; wy < baseY - 12; wy += 22) {
      for (let wx = x + 8; wx < x + w - 12; wx += 18) {
        const lit = night ? rng() < 0.75 : rng() < 0.2;
        c.fillStyle = lit ? '#ffe08a' : 'rgba(180,210,240,.25)';
        c.fillRect(wx, wy, 8, 11);
      }
    }
    x += w + rng() * 6;
  }
}
function aiRoad(c, y) {
  c.fillStyle = '#2b2f38';
  c.fillRect(0, y, AI_W, AI_H - y);
  c.fillStyle = 'rgba(255,255,255,.7)';
  for (let x = 0; x < AI_W; x += 90) c.fillRect(x, y + (AI_H - y) / 2 - 4, 50, 8);
}

/* ----- Объекты переднего плана. (x, y) — точка на земле ----- */
function aiHouse(c, x, y, s, col) {
  const w = 160 * s, h = 110 * s;
  aiShadow(c, x, y, w * 1.3, 22 * s);
  c.fillStyle = col;
  c.fillRect(x - w / 2, y - h, w, h);
  c.fillStyle = aiShade(col, -0.35);
  c.beginPath();
  c.moveTo(x - w / 2 - 16 * s, y - h);
  c.lineTo(x, y - h - 90 * s);
  c.lineTo(x + w / 2 + 16 * s, y - h);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffe38a';
  c.fillRect(x - w * 0.32, y - h * 0.72, w * 0.22, h * 0.28);
  c.fillRect(x + w * 0.1, y - h * 0.72, w * 0.22, h * 0.28);
  c.fillStyle = '#5a3a22';
  c.fillRect(x - w * 0.08, y - h * 0.5, w * 0.16, h * 0.5);
}
function aiCastle(c, x, y, s, col) {
  const body = col || '#8a8f9c';
  aiShadow(c, x, y, 260 * s, 30 * s);
  c.fillStyle = body;
  c.fillRect(x - 110 * s, y - 110 * s, 220 * s, 110 * s);
  const towers = [[x - 130 * s, 40 * s], [x - 30 * s, 60 * s], [x + 90 * s, 40 * s]];
  towers.forEach(([tx, tw], i) => {
    c.fillStyle = aiShade(body, -0.1 + i * 0.03);
    c.fillRect(tx, y - 160 * s, tw, 160 * s);
    c.fillStyle = aiShade(body, -0.25);
    for (let m = 0; m < 3; m++) c.fillRect(tx + m * (tw / 3), y - 172 * s, tw / 6, 12 * s);
  });
  c.fillStyle = '#3b2a1a';
  c.fillRect(x - 14 * s, y - 42 * s, 28 * s, 42 * s);
  c.fillStyle = '#ffe38a';
  c.fillRect(x - 6 * s, y - 100 * s, 12 * s, 18 * s);
}
function aiTree(c, x, y, s, col) {
  aiShadow(c, x, y, 110 * s, 20 * s);
  c.fillStyle = '#6b4a2b';
  c.fillRect(x - 7 * s, y - 70 * s, 14 * s, 70 * s);
  c.fillStyle = aiShade(col, -0.15);
  [[0, -110, 55], [-35, -85, 38], [35, -85, 38]].forEach(([dx, dy, r]) => {
    c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
  });
  c.fillStyle = col;
  c.beginPath(); c.arc(x, y - 75 * s, 44 * s, 0, Math.PI * 2); c.fill();
}
function aiFir(c, x, y, s, col) {
  aiShadow(c, x, y, 90 * s, 16 * s);
  c.fillStyle = '#5a3b22';
  c.fillRect(x - 6 * s, y - 40 * s, 12 * s, 40 * s);
  const tiers = [[y - 150 * s, y - 80 * s, 30 * s], [y - 120 * s, y - 50 * s, 45 * s], [y - 90 * s, y - 40 * s, 58 * s]];
  tiers.forEach(([top, bottom, half], i) => {
    c.fillStyle = aiShade(col, -0.15 + i * 0.07);
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x + half, bottom);
    c.lineTo(x - half, bottom);
    c.closePath();
    c.fill();
  });
}
function aiPalm(c, x, y, s, col) {
  aiShadow(c, x, y, 80 * s, 14 * s);
  c.strokeStyle = '#7a5530';
  c.lineWidth = 12 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + 30 * s, y - 80 * s, x + 10 * s, y - 150 * s);
  c.stroke();
  const cx = x + 10 * s, cy = y - 150 * s;
  c.fillStyle = col;
  [-160, -120, -70, -20, 20, 70, 120, 160].forEach(deg => {
    c.save();
    c.translate(cx, cy);
    c.rotate(deg * Math.PI / 180);
    c.beginPath();
    c.ellipse(0, -35 * s, 12 * s, 50 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
}
function aiLamp(c, x, y, s, col, night) {
  aiShadow(c, x, y, 40 * s, 10 * s);
  c.fillStyle = '#2a2f3a';
  c.fillRect(x - 4 * s, y - 170 * s, 8 * s, 170 * s);
  c.fillStyle = col || '#2a2f3a';
  c.beginPath(); c.ellipse(x, y - 175 * s, 22 * s, 10 * s, 0, 0, Math.PI * 2); c.fill();
  if (night) {
    const g = c.createRadialGradient(x, y - 170 * s, 4, x, y - 170 * s, 150 * s);
    g.addColorStop(0, 'rgba(255,220,130,.6)');
    g.addColorStop(1, 'rgba(255,220,130,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - 170 * s, 150 * s, 0, Math.PI * 2); c.fill();
  }
}
function aiMushroom(c, x, y, s, col) {
  aiShadow(c, x, y, 70 * s, 12 * s);
  c.fillStyle = '#f5efe0';
  c.fillRect(x - 8 * s, y - 40 * s, 16 * s, 40 * s);
  c.fillStyle = col || '#e5484d';
  c.beginPath(); c.ellipse(x, y - 40 * s, 36 * s, 26 * s, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#ffffff';
  [[-12, -48, 5], [10, -52, 4], [2, -40, 3]].forEach(([dx, dy, r]) => {
    c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
  });
}
function aiFlowers(c, rng, x, y, w, col) {
  const palette = ['#ff6b9d', '#ffd166', '#ef476f', '#a78bfa', '#fb923c'];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const fx = x + (i / (n - 1) - 0.5) * w + (rng() - 0.5) * 16;
    const h = 40 + rng() * 40;
    c.strokeStyle = '#2f7d3a';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, y - h); c.stroke();
    c.fillStyle = col || palette[i % palette.length];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      c.beginPath();
      c.arc(fx + Math.cos(a) * 9, y - h + Math.sin(a) * 9, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffe066';
    c.beginPath(); c.arc(fx, y - h, 4, 0, Math.PI * 2); c.fill();
  }
}
function aiCar(c, x, y, s, col) {
  aiShadow(c, x, y, 220 * s, 26 * s);
  aiRR(c, x - 90 * s, y - 56 * s, 180 * s, 42 * s, 12 * s);
  c.fillStyle = col;
  c.fill();
  aiRR(c, x - 50 * s, y - 86 * s, 100 * s, 36 * s, 14 * s);
  c.fillStyle = aiShade(col, -0.15);
  c.fill();
  c.fillStyle = '#9fd3ff';
  c.fillRect(x - 40 * s, y - 80 * s, 36 * s, 24 * s);
  c.fillRect(x + 4 * s, y - 80 * s, 36 * s, 24 * s);
  [-55, 55].forEach(dx => {
    c.fillStyle = '#161616';
    c.beginPath(); c.arc(x + dx * s, y - 14 * s, 17 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#bbbbbb';
    c.beginPath(); c.arc(x + dx * s, y - 14 * s, 7 * s, 0, Math.PI * 2); c.fill();
  });
}
function aiCat(c, x, y, s, col) {
  aiShadow(c, x, y, 70 * s, 14 * s);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y - 40 * s, 26 * s, 38 * s, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x, y - 86 * s, 22 * s, 0, Math.PI * 2); c.fill();
  c.beginPath();
  c.moveTo(x - 18 * s, y - 98 * s); c.lineTo(x - 16 * s, y - 118 * s); c.lineTo(x - 4 * s, y - 102 * s);
  c.moveTo(x + 18 * s, y - 98 * s); c.lineTo(x + 16 * s, y - 118 * s); c.lineTo(x + 4 * s, y - 102 * s);
  c.fill();
  c.strokeStyle = col; c.lineWidth = 8 * s; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + 22 * s, y - 10 * s); c.quadraticCurveTo(x + 60 * s, y - 20 * s, x + 50 * s, y - 70 * s); c.stroke();
}
function aiDog(c, x, y, s, col) {
  aiShadow(c, x, y, 110 * s, 16 * s);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y - 40 * s, 44 * s, 30 * s, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + 36 * s, y - 80 * s, 24 * s, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + 28 * s, y - 92 * s, 9 * s, 18 * s, 0.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = col; c.lineWidth = 9 * s; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 40 * s, y - 40 * s); c.lineTo(x - 66 * s, y - 70 * s); c.stroke();
}
function aiFire(c, x, y, s) {
  const glow = c.createRadialGradient(x, y - 30 * s, 10, x, y - 30 * s, 160 * s);
  glow.addColorStop(0, 'rgba(255,170,60,.45)');
  glow.addColorStop(1, 'rgba(255,120,30,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(x, y - 30 * s, 160 * s, 0, Math.PI * 2); c.fill();
  [['#ff7a1a', 1], ['#ffc43d', 0.7], ['#fff3b0', 0.4]].forEach(([col, k]) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - 36 * s * k, y);
    c.quadraticCurveTo(x - 40 * s * k, y - 70 * s * k, x, y - 110 * s * k);
    c.quadraticCurveTo(x + 40 * s * k, y - 70 * s * k, x + 36 * s * k, y);
    c.closePath(); c.fill();
  });
}
function aiRocket(c, x, y, s, col) {
  aiShadow(c, x, y, 70 * s, 14 * s);
  c.fillStyle = '#ff9a3c';
  c.beginPath();
  c.moveTo(x - 14 * s, y - 20 * s);
  c.quadraticCurveTo(x, y + 70 * s, x + 14 * s, y - 20 * s);
  c.fill();
  c.fillStyle = col || '#e8ecf5';
  c.fillRect(x - 18 * s, y - 170 * s, 36 * s, 150 * s);
  c.fillStyle = '#e5484d';
  c.beginPath();
  c.moveTo(x - 18 * s, y - 170 * s); c.lineTo(x + 18 * s, y - 170 * s); c.lineTo(x, y - 210 * s);
  c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - 18 * s, y - 60 * s); c.lineTo(x - 36 * s, y - 20 * s); c.lineTo(x - 18 * s, y - 20 * s); c.fill();
  c.beginPath(); c.moveTo(x + 18 * s, y - 60 * s); c.lineTo(x + 36 * s, y - 20 * s); c.lineTo(x + 18 * s, y - 20 * s); c.fill();
  c.fillStyle = '#9fd3ff';
  c.beginPath(); c.arc(x, y - 120 * s, 9 * s, 0, Math.PI * 2); c.fill();
}
function aiBird(c, x, y, s, col) {
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y, 18 * s, 11 * s, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + 16 * s, y - 6 * s, 8 * s, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x - 12 * s, y - 26 * s); c.lineTo(x + 8 * s, y - 2 * s); c.fill();
  c.beginPath(); c.moveTo(x + 22 * s, y - 6 * s); c.lineTo(x + 32 * s, y - 4 * s); c.lineTo(x + 22 * s, y - 1 * s); c.fill();
}
function aiPlane(c, x, y, s, col) {
  const body = col || '#f1f5f9';
  c.fillStyle = body;
  c.beginPath(); c.ellipse(x, y, 70 * s, 14 * s, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = aiShade(body, -0.12);
  c.beginPath();
  c.moveTo(x - 5 * s, y); c.lineTo(x + 15 * s, y); c.lineTo(x - 25 * s, y + 34 * s); c.lineTo(x - 40 * s, y + 34 * s);
  c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(x - 55 * s, y); c.lineTo(x - 70 * s, y - 22 * s); c.lineTo(x - 58 * s, y - 22 * s); c.lineTo(x - 40 * s, y);
  c.closePath(); c.fill();
  c.fillStyle = '#9fd3ff';
  for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + 30 * s - k * 16 * s, y - 4 * s, 4 * s, 0, Math.PI * 2); c.fill(); }
}
function aiFish(c, x, y, s, col) {
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y, 26 * s, 13 * s, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - 22 * s, y); c.lineTo(x - 42 * s, y - 14 * s); c.lineTo(x - 42 * s, y + 14 * s); c.fill();
  c.fillStyle = '#111';
  c.beginPath(); c.arc(x + 14 * s, y - 3 * s, 2.5 * s, 0, Math.PI * 2); c.fill();
}
function aiBoat(c, x, y, s) {
  c.fillStyle = '#7a4a2a';
  c.beginPath();
  c.moveTo(x - 80 * s, y - 20 * s); c.lineTo(x + 80 * s, y - 20 * s);
  c.lineTo(x + 58 * s, y + 10 * s); c.lineTo(x - 58 * s, y + 10 * s);
  c.closePath(); c.fill();
  c.fillStyle = '#e8e8e8';
  c.fillRect(x - 3 * s, y - 130 * s, 5 * s, 112 * s);
  c.beginPath(); c.moveTo(x + 4 * s, y - 126 * s); c.lineTo(x + 62 * s, y - 40 * s); c.lineTo(x + 4 * s, y - 40 * s); c.fill();
}
function aiRain(c, rng, n) {
  c.strokeStyle = 'rgba(200,220,255,.35)';
  c.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const x = rng() * AI_W, y = rng() * AI_H;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y + 16); c.stroke();
  }
}
function aiSnow(c, rng, n) {
  c.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < n; i++) {
    c.beginPath(); c.arc(rng() * AI_W, rng() * AI_H, 1.5 + rng() * 2.5, 0, Math.PI * 2); c.fill();
  }
}
/* Абстракция: используется, если объекты не распознаны */
function aiAbstract(c, rng, pal) {
  c.fillStyle = pal[0];
  c.fillRect(0, 0, AI_W, AI_H);
  for (let i = 0; i < 26; i++) {
    const x = rng() * AI_W, y = rng() * AI_H, r = 40 + rng() * 260;
    const col = pal[1 + Math.floor(rng() * (pal.length - 1))];
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, aiAlpha(col, 0.75));
    g.addColorStop(1, aiAlpha(col, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, AI_W, AI_H);
  }
}

/* Шумовая текстура для «зернистости»: создаётся один раз */
let AI_NOISE = null;
function aiNoisePattern(c) {
  if (!AI_NOISE) {
    const n = document.createElement('canvas');
    n.width = n.height = 160;
    const nc = n.getContext('2d');
    const img = nc.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nc.putImageData(img, 0, 0);
    AI_NOISE = n;
  }
  return c.createPattern(AI_NOISE, 'repeat');
}

/* ---------- Сборка сцены ---------- */
/* Полосы по X для положения: слева, справа, в центре */
const AI_BANDS = { left: [0.06, 0.34], right: [0.66, 0.94], center: [0.38, 0.62] };

function aiPaint(c, P, rng) {
  const has = k => P.objects.includes(k);
  const colOf = (k, def) => {
    const o = P.occ.find(x => x.key === k && x.color);
    return o ? o.color : def;
  };
  const time = P.time;
  const night = time === 'night';
  const dark = P.weather === 'rain' || P.weather === 'cloudy' || P.weather === 'snow';
  const hasSea = has('sea') || has('boat') || has('fish');
  const sunX = time === 'sunset' ? AI_W * 0.72 : AI_W * 0.8;
  const sunY = time === 'sunset' ? AI_GROUND - 30 : 150;

  /* Небо и небесные тела */
  aiSky(c, time, P.skyColor, dark);
  if (night || has('stars')) aiStars(c, rng, has('stars') ? 220 : 120);
  if (has('sun') || time === 'sunset') aiSun(c, sunX, sunY, time === 'sunset' ? 90 : 60, time === 'sunset' ? '#ff9a5a' : '#ffd45c');
  if (has('moon') || (night && !has('sun'))) aiMoon(c, AI_W * 0.8, 150, 46);
  if (has('rainbow')) aiRainbow(c, AI_W * 0.5, AI_GROUND + 40);

  const cloudN = has('clouds') ? 6 : dark ? 9 : night ? 0 : time === 'sunset' ? 2 : 3;
  for (let i = 0; i < cloudN; i++) {
    aiCloud(c, rng() * AI_W, 60 + rng() * 200, 0.8 + rng() * 0.8, dark ? 0.9 : 0.75, dark);
  }

  /* Горы и холмы */
  if (has('mountains')) {
    const base = colOf('mountains', '#5b6b84');
    aiMountains(c, rng, AI_GROUND, 260, aiMix(base, '#8fa2c4', night ? 0.2 : 0.5), false);
    aiMountains(c, rng, AI_GROUND + 10, 170, colOf('mountains', '#3f4f66'), P.weather === 'snow');
  }
  if (has('hills')) aiHills(c, rng, AI_GROUND + 6, colOf('hills', '#3d7a48'));

  /* Земля или вода */
  if (hasSea) aiSea(c, rng, AI_GROUND, colOf('sea', '#1e6fb8'), time, sunX);
  else aiGrass(c, AI_GROUND, colOf('field', '#4f8f3a'));
  if (has('river')) aiRiver(c, colOf('river', null), rng() * 6);
  if (has('grass')) aiGrassTufts(c, rng, colOf('grass', '#4f8f3a'));

  if (has('city')) aiCity(c, rng, AI_GROUND, night, colOf('city', '#56606f'));
  if (has('road')) aiRoad(c, AI_GROUND + 120);

  /* Объекты: каждое упоминание — один или несколько экземпляров (по числу) */
  const items = [];
  const shuffledSlots = [0.14, 0.32, 0.5, 0.68, 0.86];
  for (let i = shuffledSlots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j], shuffledSlots[i]];
  }
  let slotI = 0;

  P.occ.forEach(o => {
    const isSky = AI_SKY_KEYS.includes(o.key);
    const isGround = AI_GROUND_KEYS.includes(o.key);
    if (!isSky && !isGround) return;
    const n = o.count;
    let band;
    if (o.pos && AI_BANDS[o.pos]) band = AI_BANDS[o.pos];
    else {
      const s = shuffledSlots[slotI++ % shuffledSlots.length];
      band = [Math.max(0.04, s - 0.1), Math.min(0.96, s + 0.1)];
    }
    const sizeK = o.size === 'big' ? 1.45 : o.size === 'small' ? 0.65 : 1;
    for (let k = 0; k < n; k++) {
      const fx = band[0] + ((k + 0.5) / n) * (band[1] - band[0]) + (rng() - 0.5) * 0.02;
      const x = fx * AI_W;
      let y, depthK;
      if (isSky) { y = 170 + rng() * 120; depthK = 1; }
      else if (o.pos === 'far') { y = AI_GROUND + 30 + rng() * 12; depthK = 0.62; }
      else if (o.pos === 'near') { y = AI_H - 60 + rng() * 10; depthK = 1.3; }
      else { y = AI_GROUND + 70 + rng() * 50; depthK = 1; }
      if (o.key === 'car' && has('road')) y = AI_GROUND + 175;
      items.push({ key: o.key, x, y, s: (AI_BASE_SCALE[o.key] || 1) * depthK * sizeK, col: o.color });
    }
  });

  /* Дальние — раньше, ближние — позже (поверх) */
  items.sort((a, b) => a.y - b.y);
  items.forEach(it => {
    const { key, x, y, s, col } = it;
    switch (key) {
      case 'house': aiHouse(c, x, y, s, col || '#c8864a'); break;
      case 'castle': aiCastle(c, x, y, s, col); break;
      case 'tree': aiTree(c, x, y, s, col || '#2f8f4e'); break;
      case 'forest': aiTree(c, x, y, s * 0.9, col || '#237a3e'); break;
      case 'fir': aiFir(c, x, y, s, col || '#1f6b3a'); break;
      case 'palm': aiPalm(c, x, y, s, col || '#2f9e5b'); break;
      case 'flowers': aiFlowers(c, rng, x, y, 240 * s, col); break;
      case 'mushroom': aiMushroom(c, x, y, s, col); break;
      case 'lamp': aiLamp(c, x, y, s, col, night); break;
      case 'car': aiCar(c, x, y, s, col || '#d9534f'); break;
      case 'cat': aiCat(c, x, y, s, col || '#2b2b33'); break;
      case 'dog': aiDog(c, x, y, s, col || '#a0764a'); break;
      case 'fire': aiFire(c, x, y, s); break;
      case 'rocket': aiRocket(c, x, y, s, col); break;
      case 'bird': aiBird(c, x, y, s, col || '#222831'); break;
      case 'plane': aiPlane(c, x, y, s, col); break;
    }
  });

  if (has('boat')) aiBoat(c, AI_W * (0.25 + rng() * 0.5), AI_GROUND + 40, 1.0);
  if (has('fish')) for (let k = 0; k < 3; k++) aiFish(c, rng() * AI_W, AI_GROUND + 90 + rng() * 200, 1.0, colOf('fish', '#ffb703'));

  if (P.weather === 'rain') aiRain(c, rng, 260);
  if (P.weather === 'snow') aiSnow(c, rng, 180);
}

/* Главная функция: рисует сцену на canvas с заданным разрешением */
function aiRender(canvas, { prompt, seed, res }) {
  const R = AI_RES[res] || AI_RES['720p'];
  const P = aiParse(prompt);
  const rng = aiRng(seed);
  canvas.width = R.w;
  canvas.height = R.h;
  const c = canvas.getContext('2d');
  c.setTransform(R.w / AI_W, 0, 0, R.h / AI_H, 0, 0);

  const abstract = P.objects.length === 0;
  if (abstract) {
    const timePal = AI_TIME_SKY[P.time] || AI_TIME_SKY.day;
    const pal = [P.globalColor || '#0f1733', ...P.occ.map(o => o.color).filter(Boolean), ...timePal, '#ff6b6b', '#ffd43b', '#4dabf7', '#b197fc']
      .filter((v, i, a) => v && a.indexOf(v) === i);
    aiAbstract(c, rng, pal);
  } else {
    aiPaint(c, P, rng);
  }

  /* Виньетка и зерно — одинаково для любой сцены */
  const vg = c.createRadialGradient(AI_W / 2, AI_H / 2, AI_H * 0.4, AI_W / 2, AI_H / 2, AI_W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.45)');
  c.fillStyle = vg;
  c.fillRect(0, 0, AI_W, AI_H);
  c.globalAlpha = 0.07;
  c.fillStyle = aiNoisePattern(c);
  c.fillRect(0, 0, AI_W, AI_H);
  c.globalAlpha = 1;

  /* Сводка: сколько каждого объекта нарисовано */
  const counts = {};
  P.occ.forEach(o => { counts[o.key] = (counts[o.key] || 0) + o.count; });
  const drawn = Object.keys(counts).map(k => `${AI_OBJ_RU[k] || k}${counts[k] > 1 ? ' ×' + counts[k] : ''}`);

  return {
    abstract,
    drawn,
    time: P.time,
    weather: P.weather,
    unknown: P.unknown
  };
}

/* ---------- Окно генератора ---------- */
registerApp({ id: 'ai', name: 'ИИ-генератор', icon: 'ai', open: () => openAI() });

const AI_EXAMPLES = [
  'закат над морем с горами и лодкой',
  'два дерева слева и дом справа, день',
  'ночной город с луной и звёздами',
  'большой красный дом у леса, дождь',
  'три цветка на переднем плане, утро',
  'замок на горах и самолёт в небе, закат'
];

const AI_HELP_HTML = `
  <details class="gen-help"><summary>Что понимает генератор</summary>
    <div class="muted" style="font-size:12px;line-height:1.5">
      <b>Объекты:</b> небо, облака, солнце, луна, звёзды, радуга, горы, холмы, море, река, трава,
      дом, замок, дерево, ель, пальма, лес, цветы, гриб, фонарь, город, машина, дорога, кот, собака,
      птица, самолёт, ракета, рыба, лодка, огонь.<br>
      <b>Количество:</b> «два дерева», «3 дома», «несколько деревьев».<br>
      <b>Положение:</b> слева, справа, в центре, вдали, на переднем плане.<br>
      <b>Размер:</b> большой, огромный, маленький.<br>
      <b>Время:</b> день, утро, закат, ночь. <b>Погода:</b> дождь, снег, облачно.<br>
      <b>Цвета:</b> красный, синий, зелёный и т. д. Цвет относится к ближайшему объекту.<br>
      <b>Не рисуется:</b> люди, текст, конкретные марки и породы, всё, что не из списка.
      Такие слова выводятся под картинкой в «Не поняты».
    </div>
  </details>`;

function openAI() {
  openWindow({
    appId: 'ai', title: 'ИИ-генератор изображений', icon: 'ai', w: 980, h: 620, singleton: true,
    render: (body, win) => {
      body.innerHTML = `
        <div class="gen" style="height:100%">
          <div class="gen-main">
            <div class="gen-row">
              <input class="input" data-a="prompt" placeholder="Например: два дерева слева и дом справа, закат"
                     style="flex:1" value="${esc(AI_EXAMPLES[0])}">
              <button class="btn primary" data-a="gen">Сгенерировать</button>
            </div>
            <div class="gen-row" data-a="ex">
              ${AI_EXAMPLES.map((e, i) => `<button class="btn ghost" data-e="${i}" style="font-size:12px;padding:4px 10px">${esc(e)}</button>`).join('')}
            </div>
            <div class="gen-canvas-wrap"><canvas data-a="cvs"></canvas></div>
            <div class="gen-note" data-a="note"></div>
            <div class="gen-row">
              <button class="btn" data-a="dl">Скачать PNG</button>
              <button class="btn" data-a="again">Сгенерировать заново</button>
              <button class="btn" data-a="wall">Сделать обоями</button>
            </div>
          </div>
          <div class="gen-side">
            <div class="set-card" style="padding:10px 12px">
              <div class="hist-row" style="border:0"><span>Коины</span><b data-a="bal" style="color:#ffd23f"></b></div>
            </div>
            <div><b>Качество</b></div>
            <div class="res-row" data-a="res">
              ${Object.keys(AI_RES).map(k => `<button class="res-btn" data-r="${k}"><b>${AI_RES[k].label}</b>${AI_RES[k].cost} коинов</button>`).join('')}
            </div>
            ${AI_HELP_HTML}
            <div><b>История</b> <span class="muted" style="font-size:12px">(нажмите, чтобы открыть)</span></div>
            <div class="hist-grid" data-a="hist"></div>
          </div>
        </div>`;

      const cvs = $('[data-a="cvs"]', body);
      const prompt = $('[data-a="prompt"]', body);
      const note = $('[data-a="note"]', body);
      const balEl = $('[data-a="bal"]', body);
      let res = '720p';
      let cur = null;   // {prompt, seed, res}

      const setNote = (text, warn = false) => {
        note.textContent = text;
        note.classList.toggle('warn', warn);
      };
      const updResButtons = () => {
        $$('[data-r]', body).forEach(b => b.classList.toggle('on', b.dataset.r === res));
      };
      const showBal = () => {
        balEl.textContent = coinsBalance();
        if (body.isConnected) updResButtons();
      };
      onCoins(showBal);

      const loadHistory = () => load(KEY.ai, []);
      const renderHistory = () => {
        const list = loadHistory();
        const box = $('[data-a="hist"]', body);
        box.innerHTML = list.length
          ? list.map((h, i) => `<button data-h="${i}" title="${esc(h.prompt)}"><img src="${h.thumb}" alt=""></button>`).join('')
          : '<div class="muted" style="font-size:12px;grid-column:span 2">Пусто</div>';
        $$('[data-h]', box).forEach(b => b.onclick = () => {
          const h = loadHistory()[+b.dataset.h];
          if (!h) return;
          prompt.value = h.prompt;
          res = h.res;
          updResButtons();
          draw({ prompt: h.prompt, seed: h.seed, res: h.res }, false);
        });
      };
      const pushHistory = entry => {
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 320; thumbCanvas.height = 180;
        thumbCanvas.getContext('2d').drawImage(cvs, 0, 0, 320, 180);
        const item = { id: uid(), prompt: entry.prompt, seed: entry.seed, res: entry.res, t: Date.now(), thumb: thumbCanvas.toDataURL('image/jpeg', 0.7) };
        const list = [item, ...loadHistory()].slice(0, 12);
        if (!save(KEY.ai, list)) save(KEY.ai, list.slice(0, 4));
        renderHistory();
      };

      /* Рисует сцену и выводит честный отчёт: что нарисовано, что не понято */
      const draw = (params, charge) => {
        const cost = AI_RES[params.res].cost;
        const info = aiRender(cvs, params);
        cur = params;
        const parts = [];
        parts.push(info.abstract
          ? 'Объекты не распознаны — нарисована абстрактная композиция в палитре запроса.'
          : `Нарисовано: ${info.drawn.join(', ')}.`);
        if (!info.abstract) parts.push(`Время: ${info.time}, погода: ${info.weather}.`);
        if (info.unknown.length) parts.push(`Не поняты: ${info.unknown.join(', ')}.`);
        if (charge) parts.push(`Списано ${cost} коинов.`);
        setNote(parts.join(' '), info.abstract || info.unknown.length > 0);
        return info;
      };

      const generate = newSeed => {
        const text = prompt.value.trim();
        if (!text) { setNote('Введите описание.', true); return; }
        const cost = AI_RES[res].cost;
        const bal = coinsBalance();
        if (bal < cost) {
          setNote(`Не хватает коинов: нужно ${cost}, у вас ${bal}. Заработайте в «Играх».`, true);
          return;
        }
        if (!spendCoins(cost, `Генерация ${res}`)) {
          setNote('Не удалось списать коины.', true);
          return;
        }
        try {
          const params = { prompt: text, seed: newSeed ? aiHash(text + Date.now()) : aiHash(text), res };
          draw(params, true);
          pushHistory(params);
        } catch (e) {
          console.error(e);
          addCoins(cost, 'Возврат: ошибка генерации');
          setNote('Ошибка генерации, коины возвращены.', true);
        }
      };

      $$('[data-r]', body).forEach(b => b.onclick = () => { res = b.dataset.r; updResButtons(); });
      $$('[data-e]', body).forEach(b => b.onclick = () => { prompt.value = AI_EXAMPLES[+b.dataset.e]; });
      prompt.addEventListener('keydown', e => { if (e.key === 'Enter') generate(false); });
      $('[data-a="gen"]', body).onclick = () => generate(false);
      $('[data-a="again"]', body).onclick = () => generate(true);
      $('[data-a="dl"]', body).onclick = () => {
        if (!cur) { setNote('Сначала сгенерируйте изображение.', true); return; }
        const a = document.createElement('a');
        a.download = 'aether-' + (cur.prompt.slice(0, 24).replace(/[^\wа-яё]+/gi, '_') || 'image') + '.png';
        a.href = cvs.toDataURL('image/png');
        a.click();
      };
      $('[data-a="wall"]', body).onclick = () => {
        if (!cur) { setNote('Сначала сгенерируйте изображение.', true); return; }
        const small = document.createElement('canvas');
        small.width = 1280; small.height = 720;
        small.getContext('2d').drawImage(cvs, 0, 0, 1280, 720);
        S.wallCustom = small.toDataURL('image/jpeg', 0.85);
        S.wallpaper = 'custom';
        if (save(KEY.settings, S)) {
          applySettings();
          setNote('Картинка установлена обоями.');
        } else {
          setNote('Не хватило места в хранилище.', true);
        }
      };

      showBal();
      renderHistory();
      const first = loadHistory()[0];
      if (first) {
        prompt.value = first.prompt;
        res = first.res;
        updResButtons();
        draw({ prompt: first.prompt, seed: first.seed, res: first.res }, false);
        cur = { prompt: first.prompt, seed: first.seed, res: first.res };
      } else {
        cvs.width = 1280; cvs.height = 720;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#0c1020'; ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#9aa3b5'; ctx.font = '32px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Опишите сцену и нажмите «Сгенерировать»', 640, 360);
        updResButtons();
      }
    }
  });
}
