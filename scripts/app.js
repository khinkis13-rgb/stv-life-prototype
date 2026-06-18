/* ==========================================================================
   СТВ Life — интерактив демо-прототипа (Фаза 4)
   Чистый ES, без сборки и зависимостей. Работает по file:// (состояние в
   localStorage с fallback в память). Оживляет канонический сценарий §14:
   баланс переносится между страницами, идея даёт +30, обмен списывает Coins,
   запись на активность переключается, прогресс «до худи» пересчитывается.

   Структура:
   1. STATE        — модель состояния + доступ к localStorage (try/catch)
   2. helpers      — мелкие утилиты (форматирование, парсинг хуков)
   3. toast        — компонент уведомлений
   4. renderBalance— перерисовка всех data-хуков баланса/остатка/прогресса
   5. initIdeaForm — форма «предложить идею» (lab.html)
   6. initStore    — кнопки «Обменять Coins» (store.html)
   7. initOrders   — дорисовка заказов в «Мои заказы» (cabinet.html)
   8. initSignups  — кнопки «Записаться» (vibe.html)
   9. initReset    — ссылка «Сбросить демо» в футере (все страницы)
   10. init        — точка входа (DOMContentLoaded уже наступил из-за defer)
   ========================================================================== */

(function () {
  "use strict";

  // === Стартовые значения демо-персоны (из спеки §3.2, цель — худи 700) ===
  var DEFAULTS = {
    balance: 620,       // текущий баланс Coins
    earnedMonth: 340,   // получено за месяц
    goal: 700,          // цель: худи New STV Era
    orders: [],         // добавленные в демо заказы
    ideas: [],          // добавленные в демо идеи
    signups: []         // id событий, на которые записан
  };

  var STORAGE_KEY = "stvlife";

  // ----------------------------------------------------------------------
  // 1. STATE — доступ к localStorage с fallback в память (на случай file://
  //    с заблокированным storage). Любая ошибка storage не должна ронять UI.
  // ----------------------------------------------------------------------
  var memoryStore = null; // запасной in-memory объект на window-уровне

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Подмешиваем дефолты на случай старой/неполной записи.
        return mergeDefaults(parsed);
      }
    } catch (e) {
      // storage недоступен или JSON битый — идём в fallback ниже.
    }
    if (memoryStore) return memoryStore;
    return mergeDefaults(null);
  }

  function saveState(state) {
    memoryStore = state; // всегда держим актуальную копию в памяти
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // не критично — состояние живёт в memoryStore до перезагрузки
    }
  }

  // Гарантируем все поля и корректные типы (особенно массивы).
  function mergeDefaults(obj) {
    obj = obj || {};
    return {
      balance: typeof obj.balance === "number" ? obj.balance : DEFAULTS.balance,
      earnedMonth: typeof obj.earnedMonth === "number" ? obj.earnedMonth : DEFAULTS.earnedMonth,
      goal: typeof obj.goal === "number" ? obj.goal : DEFAULTS.goal,
      orders: Array.isArray(obj.orders) ? obj.orders : [],
      ideas: Array.isArray(obj.ideas) ? obj.ideas : [],
      signups: Array.isArray(obj.signups) ? obj.signups : []
    };
  }

  // ----------------------------------------------------------------------
  // 2. helpers
  // ----------------------------------------------------------------------
  // Остаток до цели — не уходит в минус.
  function remaining(state) {
    return Math.max(0, state.goal - state.balance);
  }
  // Прогресс к цели в процентах, 0..100.
  function progressPct(state) {
    if (state.goal <= 0) return 100;
    return Math.min(100, Math.round((state.balance / state.goal) * 100));
  }
  // Удобный querySelectorAll → массив.
  function all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  // ----------------------------------------------------------------------
  // 3. toast — уведомления (фиксированный угол, авто-скрытие ~3с).
  //    Стили инжектятся один раз, в брендовых токенах.
  // ----------------------------------------------------------------------
  function ensureToastStyles() {
    if (document.getElementById("stv-toast-styles")) return;
    var css =
      ".stv-toast-wrap{position:fixed;right:var(--space-5);bottom:var(--space-5);z-index:1000;" +
      "display:flex;flex-direction:column;gap:var(--space-2);max-width:min(360px,calc(100vw - 32px));pointer-events:none}" +
      ".stv-toast{display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-4);" +
      "border-radius:var(--radius-md);box-shadow:var(--shadow-md);font-size:var(--text-sm);font-weight:var(--weight-bold);" +
      "color:var(--color-on-dark);background:var(--color-dark-surface);border:1px solid rgba(255,255,255,0.10);" +
      "opacity:0;transform:translateY(8px);transition:opacity var(--transition),transform var(--transition);pointer-events:auto}" +
      ".stv-toast.is-visible{opacity:1;transform:translateY(0)}" +
      ".stv-toast__bar{flex-shrink:0;width:4px;align-self:stretch;border-radius:var(--radius-pill);background:var(--stv-green)}" +
      ".stv-toast--error .stv-toast__bar{background:var(--stv-pink)}" +
      ".stv-toast__text{line-height:var(--leading-snug)}";
    var style = document.createElement("style");
    style.id = "stv-toast-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function toastWrap() {
    var wrap = document.querySelector(".stv-toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "stv-toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  // type: "success" (по умолчанию) | "error"
  function showToast(message, type) {
    ensureToastStyles();
    var wrap = toastWrap();
    var el = document.createElement("div");
    el.className = "stv-toast" + (type === "error" ? " stv-toast--error" : "");
    var bar = document.createElement("span");
    bar.className = "stv-toast__bar";
    var text = document.createElement("span");
    text.className = "stv-toast__text";
    text.textContent = message;
    el.appendChild(bar);
    el.appendChild(text);
    wrap.appendChild(el);
    // Запускаем появление на следующем кадре (чтобы сработал transition).
    requestAnimationFrame(function () { el.classList.add("is-visible"); });
    // Авто-скрытие ~3с + аккуратное удаление из DOM.
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    }, 3000);
  }

  // ----------------------------------------------------------------------
  // 4. renderBalance — единый рендер всех data-хуков на текущей странице.
  //    data-balance        → число баланса
  //    data-earned-month   → «+340» (получено за месяц)
  //    data-remaining      → остаток до цели (число)
  //    data-progress       → ширина прогресс-бара в %
  //    Идемпотентно: всегда переписывает textContent / style.width.
  // ----------------------------------------------------------------------
  function renderBalance(state) {
    var rem = remaining(state);
    var pct = progressPct(state);

    all("[data-balance]").forEach(function (el) {
      el.textContent = String(state.balance);
    });
    all("[data-earned-month]").forEach(function (el) {
      el.textContent = "+" + state.earnedMonth;
    });
    all("[data-remaining]").forEach(function (el) {
      el.textContent = String(rem);
    });
    all("[data-progress]").forEach(function (el) {
      el.style.width = pct + "%";
    });
    // Текстовые пары «620 / 700 Coins» помечены data-balance-goal.
    all("[data-balance-goal]").forEach(function (el) {
      el.textContent = state.balance + " / " + state.goal + " Coins";
    });
  }

  // ----------------------------------------------------------------------
  // 5. initIdeaForm — форма «предложить идею» (lab.html, #idea-form)
  //    submit → +30 balance/earnedMonth, запись в ideas, новая карточка
  //    «Новая» в начало списка инициатив, тост, очистка формы.
  // ----------------------------------------------------------------------
  function initIdeaForm(state) {
    var form = document.getElementById("idea-form");
    if (!form) return; // страницы без формы пропускают инициализацию

    // Контейнер списка инициатив = первая сетка карточек в секции
    // «Инициативы команды». Находим по якорю формы — берём ближайшую
    // секцию с .stv-grid, в которой лежат карточки инициатив.
    var initGrid = findInitiativesGrid();

    // При загрузке — дорисовываем ранее поданные идеи из состояния
    // (идемпотентно: сначала чистим прежде вставленные динамические узлы).
    rerenderIdeas(state, initGrid);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var titleInput = document.getElementById("idea-title");
      var title = (titleInput && titleInput.value || "").trim();

      // Пустое название — не отправляем, мягко подсвечиваем поле.
      if (!title) {
        if (titleInput) {
          titleInput.style.borderColor = "var(--stv-pink)";
          titleInput.focus();
        }
        showToast("Укажите название идеи", "error");
        return;
      }
      if (titleInput) titleInput.style.borderColor = ""; // сброс подсветки

      var categorySel = document.getElementById("idea-category");
      var categoryLabel = "Идея";
      if (categorySel && categorySel.selectedIndex >= 0) {
        categoryLabel = categorySel.options[categorySel.selectedIndex].text;
      }

      // Обновляем состояние: +30 Coins, новая идея в начало.
      state.balance += 30;
      state.earnedMonth += 30;
      state.ideas.unshift({ title: title, category: categoryLabel });
      saveState(state);

      // Перерисовываем баланс везде и список идей.
      renderBalance(state);
      rerenderIdeas(state, initGrid);

      showToast("Идея отправлена. +30 Coins");
      form.reset();
    });
  }

  // Находит сетку карточек со списком инициатив (а не топ/легенду).
  // В lab.html это .stv-grid в секции «Инициативы команды».
  function findInitiativesGrid() {
    var grids = all(".stv-grid");
    // Берём первую сетку, чьи карточки содержат ссылку «Открыть карточку».
    for (var i = 0; i < grids.length; i++) {
      if (grids[i].querySelector('a[href="#init-templates"]')) {
        return grids[i];
      }
    }
    return grids.length ? grids[0] : null;
  }

  // Перерисовка списка идей: удаляем ранее вставленные динамические карточки
  // и заново вставляем их в начало из state.ideas (идемпотентность при F5).
  function rerenderIdeas(state, grid) {
    if (!grid) return;
    all('[data-dynamic="idea"]', grid).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    // Вставляем в обратном порядке, чтобы самая свежая (ideas[0]) оказалась
    // первой в DOM (insertBefore первого ребёнка для каждой).
    for (var i = state.ideas.length - 1; i >= 0; i--) {
      var card = buildIdeaCard(state.ideas[i]);
      grid.insertBefore(card, grid.firstChild);
    }
  }

  // Карточка инициативы со статусом «Новая» — те же классы, что в lab.html.
  function buildIdeaCard(idea) {
    var article = document.createElement("article");
    article.className = "stv-card stv-card--hover";
    article.setAttribute("data-dynamic", "idea");
    article.innerHTML =
      '<div class="stv-row stv-row--between" style="margin-bottom:var(--space-3)">' +
        '<span class="stv-status stv-status--new">Новая</span>' +
        '<span class="stv-badge">' + escapeHtml(idea.category) + '</span>' +
      '</div>' +
      '<div class="stv-card__title">' + escapeHtml(idea.title) + '</div>' +
      '<p class="stv-small stv-muted" style="margin-bottom:var(--space-4)">Автор: Игорь Соколов · видеомонтажёр</p>' +
      '<div class="stv-initmeta">' +
        '<span class="stv-initmeta__item stv-initmeta__item--votes"><svg class="stv-icon" aria-hidden="true"><use href="#stv-idea"></use></svg>—</span>' +
        '<span class="stv-initmeta__item stv-initmeta__item--comments"><svg class="stv-icon" aria-hidden="true"><use href="#stv-thanks"></use></svg>0 комментов</span>' +
        '<span class="stv-initmeta__item stv-initmeta__item--coins"><svg class="stv-icon" aria-hidden="true"><use href="#stv-coin"></use></svg>+30</span>' +
      '</div>' +
      '<div class="stv-card__foot">' +
        '<a class="stv-btn stv-btn--secondary stv-btn--sm" href="#init-templates">Открыть карточку →</a>' +
      '</div>';
    return article;
  }

  // ----------------------------------------------------------------------
  // 6. initStore — кнопки «Обменять Coins» (store.html)
  //    Делегирование по data-action="exchange": списываем цену, пишем заказ,
  //    тост. Не хватает Coins — тост-ошибка.
  // ----------------------------------------------------------------------
  function initStore(state) {
    var exchangeButtons = all('[data-action="exchange"]');
    if (!exchangeButtons.length) return;

    exchangeButtons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var item = btn.getAttribute("data-item") || "Товар";
        var price = parseInt(btn.getAttribute("data-price"), 10) || 0;
        var img = btn.getAttribute("data-img") || "";

        if (state.balance < price) {
          var need = price - state.balance;
          showToast("Не хватает " + need + " Coins", "error");
          return;
        }

        state.balance -= price;
        state.orders.unshift({
          title: item,
          price: price,
          img: img,
          date: "оформлен только что",
          status: "оформлен"
        });
        saveState(state);

        renderBalance(state);
        showToast("Заказ оформлен: " + item + ". −" + price + " Coins");
      });
    });
  }

  // ----------------------------------------------------------------------
  // 7. initOrders — «Мои заказы» (cabinet.html)
  //    При загрузке ЛК дорисовываем заказы из state.orders в начало блока.
  //    Идемпотентно: чистим прежде вставленные динамические узлы.
  // ----------------------------------------------------------------------
  function initOrders(state) {
    var grid = document.getElementById("orders-grid");
    if (!grid) return;

    all('[data-dynamic="order"]', grid).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    for (var i = state.orders.length - 1; i >= 0; i--) {
      var card = buildOrderCard(state.orders[i]);
      grid.insertBefore(card, grid.firstChild);
    }
  }

  // Карточка заказа — те же классы, что у статичных заказов в cabinet.html.
  function buildOrderCard(order) {
    var wrap = document.createElement("div");
    wrap.className = "stv-card";
    wrap.setAttribute("data-dynamic", "order");

    var media;
    if (order.img) {
      media =
        '<span class="stv-order__media" aria-hidden="true">' +
          '<img src="' + escapeHtml(order.img) + '" alt="' + escapeHtml(order.title) + '">' +
        '</span>';
    } else {
      media =
        '<span class="stv-order__media stv-order__media--empty" aria-hidden="true">' +
          '<svg class="stv-icon" aria-hidden="true"><use href="#stv-store"></use></svg>' +
        '</span>';
    }

    wrap.innerHTML =
      '<div class="stv-order">' +
        media +
        '<div>' +
          '<div class="stv-row stv-row--between" style="margin-bottom:var(--space-2)">' +
            '<span class="stv-status stv-status--instock">Оформлен</span>' +
          '</div>' +
          '<div class="stv-order__title">' + escapeHtml(order.title) + '</div>' +
          '<p class="stv-meta" style="margin:0">Заказан ' + escapeHtml(order.date) +
            ' · −' + order.price + ' Coins · пункт выдачи, 3 этаж</p>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  // ----------------------------------------------------------------------
  // 8. initSignups — кнопки «Записаться» (vibe.html, data-action="signup")
  //    Переключение записан/нет: текст кнопки, видимый счётчик, состояние.
  //    Несколько кнопок могут указывать на один data-event — синхронизируем.
  // ----------------------------------------------------------------------
  function initSignups(state) {
    var buttons = all('[data-action="signup"]');
    if (!buttons.length) return;

    // Базовый текст и базовое значение счётчика запоминаем в data-атрибутах,
    // чтобы корректно откатываться при отмене (идемпотентно при F5).
    var counter = document.getElementById("signup-counter");
    var baseCount = counter ? parseInt(counter.getAttribute("data-base"), 10) : 0;

    // Применяем сохранённое состояние записи ко всем кнопкам события.
    function refresh() {
      buttons.forEach(function (btn) {
        var ev = btn.getAttribute("data-event");
        var joined = state.signups.indexOf(ev) !== -1;
        if (!btn.getAttribute("data-base-text")) {
          btn.setAttribute("data-base-text", btn.textContent.trim());
        }
        btn.textContent = joined ? "Вы записаны ✓" : btn.getAttribute("data-base-text");
      });
      // Счётчик участников ближайшего события = база + записан ли на него.
      if (counter) {
        var featuredEvent = counter.getAttribute("data-event");
        var inc = state.signups.indexOf(featuredEvent) !== -1 ? 1 : 0;
        counter.textContent = "+" + (baseCount + inc) + " идут";
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var ev = btn.getAttribute("data-event");
        var idx = state.signups.indexOf(ev);
        if (idx === -1) {
          state.signups.push(ev);
          showToast("Вы записаны на активность");
        } else {
          state.signups.splice(idx, 1);
          showToast("Запись отменена");
        }
        saveState(state);
        refresh();
      });
    });

    refresh();
  }

  // ----------------------------------------------------------------------
  // 9. initReset — «Сбросить демо» (футер, все страницы)
  // ----------------------------------------------------------------------
  function initReset() {
    var link = document.getElementById("stv-reset-demo");
    if (!link) return;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) {}
      memoryStore = null;
      window.location.reload();
    });
  }

  // ----------------------------------------------------------------------
  // helpers: экранирование вставляемого пользовательского текста (XSS-гигиена
  // даже в демо: название идеи приходит из input).
  // ----------------------------------------------------------------------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ----------------------------------------------------------------------
  // 10. init — точка входа. Скрипт подключён с defer, поэтому DOM готов.
  // ----------------------------------------------------------------------
  function init() {
    var state = loadState();
    saveState(state); // фиксируем дефолты при первой загрузке

    renderBalance(state);
    initIdeaForm(state);
    initStore(state);
    initOrders(state);
    initSignups(state);
    initReset();
  }

  init();
})();
