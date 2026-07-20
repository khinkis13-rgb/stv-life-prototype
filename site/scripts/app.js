/* ==========================================================================
   СТВ — концепт-прототип: «Пульс эфира» + «Путь сигнала»
   Все данные демонстрационные: каналы обезличены, цифры условные.
   ========================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const r = (n) => Math.floor(Math.random() * n);
const pad = (n) => String(n).padStart(2, "0");

/* --------------------------------------------------------------------------
   Часы в шапке
   -------------------------------------------------------------------------- */
function tickClock() {
  $("#clock").textContent = new Date().toLocaleTimeString("ru-RU");
}
tickClock();
setInterval(tickClock, 1000);

/* --------------------------------------------------------------------------
   ТВ-стена: 48 экранов мультивьюера. 4 «витринных» экрана — настоящие
   AI-видео (assets/tv/*.mp4), остальные «вещают» процедурно (scripts/wall.js).
   -------------------------------------------------------------------------- */
const CH_COUNT = 48;
// Канал → AI-клип (28 из 48 ячеек — настоящее видео, остальные вещают процедурно)
const VIDEO_CELLS = {
  1: "news", 3: "sport", 4: "travel", 6: "kids",
  7: "basketball", 9: "cooking", 10: "doc", 12: "wildlife",
  14: "space", 15: "concert", 17: "noir",
  19: "cartoon2", 21: "racing", 22: "talkshow", 24: "ocean",
  26: "skiing", 27: "news2", 29: "citylapse",
  31: "hockey", 33: "countryside", 34: "fashion", 36: "tennis",
  38: "market", 39: "puppets", 41: "fitness", 42: "desert",
  43: "aurora", 45: "balloons",
};
const grid = $("#channelsGrid");
const tiles = []; // { el, tv } — tv есть только у процедурных экранов

// Настроечные таблицы — стационарные заглушки на 5 каналах в разных местах
const BARS_CELLS = new Set([5, 16, 30, 37, 44]);

// Жанры раздаются равномерно (least-used): один и тот же жанр не крутится
// одновременно на куче экранов. Дополнительно — не совпадать с соседями.
const genreUse = new Map(TVWall.GENRES.map((g) => [g, 0]));
const assigned = [];
function takeGenre(avoid = []) {
  const min = Math.min(...genreUse.values());
  let pool = TVWall.GENRES.filter((g) => genreUse.get(g) === min && !avoid.includes(g));
  if (!pool.length) pool = TVWall.GENRES.filter((g) => genreUse.get(g) === min);
  const g = pool[r(pool.length)];
  genreUse.set(g, genreUse.get(g) + 1);
  return g;
}
function pickGenre(i) {
  const g = takeGenre([assigned[i - 1], assigned[i - 6]].filter(Boolean));
  assigned[i] = g;
  return g;
}

for (let i = 1; i <= CH_COUNT; i++) {
  const el = document.createElement("div");
  el.className = "screen is-live";
  el.innerHTML =
    `<span class="screen__id">${pad(i)}</span>` +
    `<i class="screen__dot"></i>` +
    `<span class="screen__state"></span>`;
  grid.appendChild(el);

  const tile = { el, tv: null };
  if (VIDEO_CELLS[i]) {
    el.classList.add("is-video");
    const v = document.createElement("video");
    v.src = `assets/tv/${VIDEO_CELLS[i]}.mp4`;
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !TVWall.reduced;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.preload = "metadata";
    // Если клип не загрузился — экран переходит на процедурное «вещание»
    v.addEventListener("error", () => {
      v.remove();
      el.classList.remove("is-video");
      tile.tv = TVWall.create(el, takeGenre(), r(1e9));
    });
    el.prepend(v);
  } else if (BARS_CELLS.has(i)) {
    tile.tv = TVWall.create(el, "bars", r(1e9));
  } else {
    tile.tv = TVWall.create(el, pickGenre(i), r(1e9));
  }
  tiles.push(tile);
}
TVWall.start();

const STATE_TEXT = { "is-prep": "готовим выпуск", "is-maint": "плановые работы" };
function setStatus(tile, cls) {
  tile.el.classList.remove("is-live", "is-prep", "is-maint");
  tile.el.classList.add(cls);
  $(".screen__state", tile.el).textContent = STATE_TEXT[cls] || "";
}
// Видео-экраны и заглушки-таблицы в ротацию статусов не попадают
const rotatable = tiles.filter((t) => t.tv && t.tv.genre !== "bars");
const byState = (cls) => rotatable.filter((t) => t.el.classList.contains(cls));

// Стартовое состояние: два канала готовят выпуск, один — на плановых работах
setStatus(rotatable[r(rotatable.length)], "is-prep");
setStatus(rotatable[r(rotatable.length)], "is-prep");
setStatus(rotatable[r(rotatable.length)], "is-maint");

// Раз в ~7 секунд один «подготовка» выходит в эфир, другой канал встаёт на подготовку
setInterval(() => {
  const prep = byState("is-prep");
  if (prep.length) setStatus(prep[r(prep.length)], "is-live");
  const live = byState("is-live");
  setStatus(live[r(live.length)], "is-prep");
}, 7000);

// Раз в ~4 секунды на 1–2 экранах меняется программа — стена живёт.
// Новый жанр берётся из наименее занятых, чтобы дубли не плодились.
function switchProgram() {
  const live = byState("is-live").filter((t) => t.tv);
  for (let k = 0, n = 1 + r(2); k < n && live.length; k++) {
    const t = live[r(live.length)];
    const old = t.tv.genre;
    genreUse.set(old, genreUse.get(old) - 1);
    t.tv.setGenre(takeGenre([old]));
    t.el.classList.add("is-switching");
    setTimeout(() => t.el.classList.remove("is-switching"), 500);
  }
}
if (!TVWall.reduced) setInterval(switchProgram, 4000);

// Вспышка экрана, когда событие журнала касается канала (ch — номер с 1)
function flashTile(n) {
  const t = tiles[n - 1];
  if (!t) return;
  t.el.classList.add("is-flash");
  setTimeout(() => t.el.classList.remove("is-flash"), 1600);
}

/* --------------------------------------------------------------------------
   Метрики: часы эфира медленно растут, приём материалов тикает от событий
   -------------------------------------------------------------------------- */
let hoursOnAir = 231552; // условно: 48 каналов × 24 ч × 201 день
let filesToday = 96;
const fmt = (n) => n.toLocaleString("ru-RU");

const mHours = $("#mHours");
const mFiles = $("#mFiles");
mHours.textContent = fmt(hoursOnAir);
mFiles.textContent = fmt(filesToday);

// 48 каналов дают ~48 часов эфира в час → +1 час примерно каждые 75 секунд
setInterval(() => {
  hoursOnAir += 1;
  mHours.textContent = fmt(hoursOnAir);
}, 75000);

/* --------------------------------------------------------------------------
   Журнал эфира: типизированные события, появляются сами,
   упомянутый канал вспыхивает на ТВ-стене
   -------------------------------------------------------------------------- */
const chNum = () => 1 + r(CH_COUNT);

// type: rx (приём) / play (плейаут) / ai (ИИ) / tech (тракт) / ok (контроль)
const EVENTS = [
  () => {
    const c = chNum();
    return { type: "ok", icon: "✓", tag: "контроль", ch: c, text: `Канал ${pad(c)} - суточный плей-лист принят и проверен` };
  },
  () => {
    const c = chNum();
    return { type: "play", icon: "▶", tag: "плейаут", ch: c, text: `Канал ${pad(c)} - выпуск передан на плейаут` };
  },
  () => {
    const c = chNum();
    return { type: "ai", icon: "⚡", tag: "ИИ · «Курилка»", ch: c, text: `ИИ-проверка сцен: нарушений не найдено - Канал ${pad(c)}` };
  },
  () => {
    const c = chNum();
    return { type: "ai", icon: "⚡", tag: "ИИ · субтитры", ch: c, text: `Субтитры сгенерированы и вшиты - Канал ${pad(c)}` };
  },
  () => {
    const c = chNum();
    return { type: "ai", icon: "⚡", tag: "ИИ · «Вторичка»", ch: c, text: `Вторичные события плей-листа подтверждены - Канал ${pad(c)}` };
  },
  () => ({ type: "tech", icon: "📡", tag: "аплинк", text: "Аплинк: параметры несущей в норме" }),
  () => ({ type: "tech", icon: "⛭", tag: "резерв", text: "Резервный тракт: проверка пройдена" }),
  () => {
    const c = chNum();
    const n = 2 + r(9);
    filesToday += n;
    mFiles.textContent = fmt(filesToday);
    return { type: "rx", icon: "▼", tag: "приём", ch: c, text: `Приём: ${n} новых материалов от Канала ${pad(c)}` };
  },
];

const feed = $("#feed");
function addEvent() {
  const ev = EVENTS[r(EVENTS.length)]();
  const now = new Date();
  const li = document.createElement("li");
  li.className = `ev ev--${ev.type}`;
  li.innerHTML =
    `<span class="ev__badge" aria-hidden="true">${ev.icon}</span>` +
    `<div class="ev__body">` +
    `<div class="ev__meta"><time>${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}</time>` +
    `<span class="ev__tag">${ev.tag}</span></div>` +
    `<p>${ev.text}</p>` +
    `</div>`;
  feed.prepend(li);
  while (feed.children.length > 8) feed.lastElementChild.remove();
  if (ev.ch) flashTile(ev.ch);
}
addEvent();
addEvent();
(function scheduleEvent() {
  setTimeout(() => {
    addEvent();
    scheduleEvent();
  }, 2500 + r(2500));
})();

/* --------------------------------------------------------------------------
   Путь сигнала: 8 этапов, зона ответственности СТВ, панель деталей.
   ⚡-метки — реальные AI-инициативы из «Мастера идей» (названия сохранены).
   -------------------------------------------------------------------------- */
const STAGES = [
  {
    n: "01", name: "Студия телеканала", stv: false,
    chips: ["мастер-копии", "сетка вещания"],
    text: "Телеканал производит контент - программы, фильмы, выпуски - и присылает нам материалы вместе с планом эфира. С этого момента эфир становится заботой СТВ.",
  },
  {
    n: "02", name: "Приём материалов", stv: true,
    chips: ["24/7", "форматы", "документы"],
    text: "Круглосуточно принимаем файлы от каналов: проверяем комплектность, технические параметры и сопроводительные документы.",
    ai: "ИИ сверяет сопроводительные документы с фактическими материалами - инициатива из «Мастера идей».",
  },
  {
    n: "03", name: "Предэфирная подготовка", stv: true,
    chips: ["техконтроль", "субтитры", "эфирные стандарты"],
    text: "Приводим материал к эфирным стандартам: технический контроль качества, монтажные правки, субтитры.",
    ai: "Нейросеть «Курилка» сама находит на тайм-лайне сцены, запрещённые к показу, а субтитры генерируются автоматически.",
  },
  {
    n: "04", name: "Плейаут 24/7", stv: true,
    chips: ["точность до секунды", "резервирование"],
    text: "Автоматизированный эфир: плей-листы, графическое оформление, переключения по секундам и полное резервирование - эфир не останавливается никогда.",
    ai: "ИИ «Вторичка» проверяет обязательные вторичные события в каждом плей-листе до выхода в эфир.",
  },
  {
    n: "05", name: "Кодирование и аплинк", stv: true,
    chips: ["DVB", "шифрование", "резервный тракт"],
    text: "Кодируем и шифруем сигнал, поднимаем его на спутник с наземной станции. Дублирующие тракты - на случай любой погоды.",
  },
  {
    n: "06", name: "Спутник ABS-2A", stv: false,
    chips: ["ГСО · 35 786 км"],
    text: "Геостационарная орбита. Один луч накрывает страну целиком - сигнал одновременно доступен от Калининграда до Камчатки.",
  },
  {
    n: "07", name: "Операторы и сети", stv: false,
    chips: ["кабель", "IPTV", "спутниковые платформы"],
    text: "Операторы принимают сигнал со спутника и доставляют его в дома - по кабелю, через интернет или напрямую на тарелку.",
  },
  {
    n: "08", name: "Зритель", stv: false,
    chips: ["кнопка на пульте"],
    text: "Человек включает телевизор - и всё просто работает. За этой простотой - весь путь, который вы только что прошли.",
  },
];

const track = $("#pathTrack");
const detail = $("#stageDetail");

function nodeHTML(s, i) {
  return (
    `<button class="node${s.stv ? " node--stv" : ""}" data-i="${i}" aria-pressed="false">` +
    `<span class="node__n">${s.n}</span>` +
    `<span>${s.name}</span>` +
    (s.ai ? `<span class="node__ai">⚡ ИИ</span>` : "") +
    `<span class="node__more">подробнее →</span>` +
    `</button>`
  );
}
const linkHTML = `<div class="link" aria-hidden="true"></div>`;

// Трек: студия → [зона СТВ: 4 этапа] → спутник → операторы → зритель
track.innerHTML =
  nodeHTML(STAGES[0], 0) +
  linkHTML +
  `<div class="zone"><span class="zone__label">зона ответственности СТВ</span>` +
  [1, 2, 3, 4].map((i) => nodeHTML(STAGES[i], i)).join(linkHTML) +
  `</div>` +
  linkHTML +
  [5, 6, 7].map((i) => nodeHTML(STAGES[i], i)).join(linkHTML);

let currentStage = 2;
function selectStage(i) {
  currentStage = i;
  const s = STAGES[i];
  track.querySelectorAll(".node").forEach((b) => {
    const active = Number(b.dataset.i) === i;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  detail.innerHTML =
    `<div class="stage-detail__head">` +
    `<span class="stage-detail__n">${s.n} / 08</span>` +
    `<h3>${s.name}</h3>` +
    s.chips.map((c) => `<span class="chip">${c}</span>`).join("") +
    `</div>` +
    `<p class="stage-detail__text">${s.text}</p>` +
    (s.ai
      ? `<div class="stage-detail__ai"><strong>⚡ Здесь работает ИИ СТВ</strong><span>${s.ai}</span></div>`
      : "");
}

// Этапы листаются сами — схема живёт и показывает, что панель ниже меняется.
// Клик посетителя выбирает этап и приостанавливает авто-показ на 15 секунд.
let pausedUntil = 0;
if (!TVWall.reduced) {
  setInterval(() => {
    if (Date.now() >= pausedUntil) selectStage((currentStage + 1) % STAGES.length);
  }, 5000);
}

track.addEventListener("click", (e) => {
  const btn = e.target.closest(".node");
  if (!btn) return;
  pausedUntil = Date.now() + 15000;
  selectStage(Number(btn.dataset.i));
});

// Старт с предэфирной подготовки — ядро бизнеса и первая ИИ-метка
selectStage(2);
