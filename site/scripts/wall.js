/* ==========================================================================
   СТВ — ТВ-стена: процедурные «телеканалы» на canvas.
   Каждый экран «вещает» кодом: новости, спорт, кино, детский, музыка,
   документалка, ток-шоу, город, реклама, погода + настроечная таблица.
   Палитра и раскладка каждой сцены зависят от seed — два экрана одного
   жанра выглядят по-разному. Все сцены условные и обезличенные.
   Экспортирует window.TVWall.
   ========================================================================== */
(function () {
  "use strict";

  const W = 176, H = 99; // внутреннее разрешение канваса (16:9)

  // Детерминированный PRNG: раскладка сцены зависит от seed, не от кадра
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
  }

  function vgrad(ctx, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }

  // Ряд серых «слов»-плашек: имитация текста без текста (каналы обезличены)
  function dashes(ctx, x, y, count, speed, t, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const dx = W - ((t * speed + i * 34) % (W + 46)) - 23;
      ctx.fillRect(dx + x, y, 14 + (i % 3) * 6, 3);
    }
  }

  /* ---------------- Жанры ---------------- */

  function news(ctx, t, rnd) {
    // Студии разных «каналов»: синяя / бордовая / фиолетовая
    const set = pick(rnd, [
      { bg: [[0, "#0F2F6D"], [1, "#1564FF"]], desk: "#0B1B45", accent: "#E50581", screenHue: 200 },
      { bg: [[0, "#4A0F2F"], [1, "#BF0072"]], desk: "#2E0A1E", accent: "#FFC200", screenHue: 330 },
      { bg: [[0, "#241F5E"], [1, "#7A73D8"]], desk: "#161240", accent: "#4DE564", screenHue: 260 },
    ]);
    ctx.fillStyle = vgrad(ctx, set.bg); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `hsl(${(set.screenHue + t * 14 + rnd() * 120) % 360} 65% 55%)`;
    rr(ctx, W * 0.55, H * 0.12, W * 0.36, H * 0.44, 3);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    rr(ctx, W * 0.58, H * 0.18, W * 0.14, H * 0.06, 1);
    const bob = Math.sin(t * 1.4) * 1.2;
    ctx.fillStyle = "#1A2340";
    ctx.beginPath(); ctx.arc(W * 0.32, H * 0.42 + bob, H * 0.13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.32, H * 0.78 + bob, H * 0.26, H * 0.22, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = set.desk; ctx.fillRect(0, H * 0.8, W, H * 0.2);
    ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fillRect(0, H * 0.8, W, H * 0.11);
    ctx.fillStyle = set.accent; ctx.fillRect(0, H * 0.8, W * 0.16, H * 0.11);
    dashes(ctx, 0, H * 0.835, 6, 26, t, "rgba(35,38,61,0.75)");
    if (t % 1.2 < 0.7) { ctx.fillStyle = "#FF3B3B"; ctx.beginPath(); ctx.arc(W * 0.07, H * 0.12, 3, 0, 7); ctx.fill(); }
  }

  function sport(ctx, t, rnd) {
    const teams = pick(rnd, [["#E50581", "#FFFFFF"], ["#1564FF", "#FFC200"], ["#23263D", "#FFFFFF"], ["#FF6B00", "#00C2C2"]]);
    // Вид спорта: футбольный газон / хоккейный лёд / баскетбольный паркет
    const court = pick(rnd, ["football", "hockey", "basketball"]);
    if (court === "football") {
      const grass = pick(rnd, [["#2F9E44", "#37B04E"], ["#278A3B", "#2FA047"], ["#33A34A", "#3CB858"]]);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = grass[i % 2];
        ctx.fillRect((W / 8) * i, 0, W / 8 + 1, H);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
    } else if (court === "hockey") {
      ctx.fillStyle = "#E8F2F8"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(180,210,230,0.5)";
      for (let i = 0; i < 20; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 6, 1);
      ctx.strokeStyle = "#C33"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, H * 0.08); ctx.lineTo(W / 2, H * 0.92); ctx.stroke();
      ctx.strokeStyle = "#2A62C4";
      [0.25, 0.75].forEach((fx) => {
        ctx.beginPath(); ctx.moveTo(W * fx, H * 0.08); ctx.lineTo(W * fx, H * 0.92); ctx.stroke();
      });
      ctx.strokeStyle = "rgba(42,98,196,0.8)";
    } else {
      const wood = pick(rnd, [["#C88A4A", "#D09650"], ["#B47B3E", "#BE8746"]]);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = wood[i % 2];
        ctx.fillRect((W / 10) * i, 0, W / 10 + 1, H);
      }
      ctx.fillStyle = "rgba(229,5,129,0.35)";
      ctx.fillRect(W * 0.04, H * 0.3, W * 0.14, H * 0.4); ctx.fillRect(W * 0.82, H * 0.3, W * 0.14, H * 0.4);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
    }
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.04, H * 0.08, W * 0.92, H * 0.84);
    if (court !== "hockey") {
      ctx.beginPath(); ctx.moveTo(W / 2, H * 0.08); ctx.lineTo(W / 2, H * 0.92); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(W / 2, H / 2, H * 0.16, 0, 7); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const phase = rnd() * 6.28, spd = 0.5 + rnd() * 0.7;
      const x = W * (0.15 + 0.7 * ((Math.sin(t * spd + phase) + 1) / 2));
      const y = H * (0.2 + 0.6 * ((Math.cos(t * spd * 0.8 + phase * 1.7) + 1) / 2));
      ctx.fillStyle = teams[i < 5 ? 0 : 1];
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#FFC200";
    ctx.beginPath(); ctx.arc(W * (0.5 + 0.3 * Math.sin(t * 1.7)), H * (0.5 + 0.25 * Math.cos(t * 2.3)), 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(10,13,24,0.75)"; rr(ctx, 5, 5, 34, 10, 2);
    ctx.fillStyle = teams[0]; ctx.fillRect(7, 7, 6, 6);
    ctx.fillStyle = teams[1]; ctx.fillRect(31, 7, 6, 6);
  }

  function film(ctx, t, rnd) {
    // Пары планов: тёплый/холодный, ночной лес/багровый, синий час/янтарь
    const pair = pick(rnd, [
      [[[0, "#2B1A0E"], [0.6, "#7A4415"], [1, "#C87F2A"]], [[0, "#0D1120"], [0.6, "#1A2340"], [1, "#3A4A7E"]]],
      [[[0, "#061C21"], [0.6, "#134E33"], [1, "#2F9E44"]], [[0, "#2A0E14"], [0.6, "#7A1030"], [1, "#BF0072"]]],
      [[[0, "#0A1630"], [0.6, "#274B8F"], [1, "#5B84C4"]], [[0, "#241303"], [0.6, "#8A5A10"], [1, "#E5A83D"]]],
    ]);
    const cut = Math.floor(t / 6) % 2;
    ctx.fillStyle = vgrad(ctx, pair[cut]); ctx.fillRect(0, 0, W, H);
    const x = ((t * 5 + rnd() * W) % (W + 40)) - 20;
    ctx.fillStyle = cut ? "rgba(220,230,255,0.8)" : "rgba(255,196,90,0.85)";
    ctx.beginPath(); ctx.arc(x, H * 0.32, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(8,10,20,0.8)";
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i <= 8; i++) ctx.lineTo((W / 8) * i, H * 0.72 + Math.sin(i * 1.7 + rnd() * 9) * 8);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 26; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H * 0.1); ctx.fillRect(0, H * 0.9, W, H * 0.1);
  }

  function kids(ctx, t, rnd) {
    ctx.fillStyle = `hsl(${(45 + rnd() * 260 + t * 6) % 360} 85% 82%)`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pick(rnd, ["#7BD389", "#F5D06E", "#8FD3F4", "#F4A9C8"]);
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    const cols = ["#E50581", "#1564FF", "#FFC200", "#4DE564"];
    const n = 2 + Math.floor(rnd() * 3), scale = 0.8 + rnd() * 0.5;
    for (let i = 0; i < n; i++) {
      const bounce = Math.abs(Math.sin(t * (1.6 + i * 0.35) + i * 2));
      const x = W * (0.5 + (i - (n - 1) / 2) * 0.28), y = H * 0.72 - bounce * H * 0.34;
      const sq = 1 - (bounce < 0.12 ? (0.12 - bounce) * 2.4 : 0);
      const s = 9 * scale;
      ctx.fillStyle = cols[(i + Math.floor(rnd() * 4)) % 4];
      const shape = (i + Math.floor(rnd() * 3)) % 3;
      if (shape === 0) { ctx.beginPath(); ctx.ellipse(x, y, s, s * sq, 0, 0, 7); ctx.fill(); }
      else if (shape === 1) rr(ctx, x - s, y - s * sq, s * 2, s * 2 * sq, 3);
      else { ctx.beginPath(); ctx.moveTo(x, y - s * sq); ctx.lineTo(x + s, y + s * 0.9 * sq); ctx.lineTo(x - s, y + s * 0.9 * sq); ctx.fill(); }
    }
    ctx.fillStyle = "#FFC200"; ctx.beginPath(); ctx.arc(W * 0.85, H * 0.18, 8, 0, 7); ctx.fill();
  }

  function music(ctx, t, rnd) {
    const set = pick(rnd, [
      { bg: [[0, "#1B1038"], [1, "#423C8B"]], top: "#4DE564", bot: "#E50581", l1: "229,5,129", l2: "77,229,100" },
      { bg: [[0, "#052A40"], [1, "#104BBF"]], top: "#FFC200", bot: "#FF0098", l1: "255,194,0", l2: "255,0,152" },
      { bg: [[0, "#230A18"], [1, "#BF0072"]], top: "#A19FFF", bot: "#FFC200", l1: "161,159,255", l2: "255,212,77" },
    ]);
    ctx.fillStyle = vgrad(ctx, set.bg); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(${set.l1},${0.12 + 0.1 * Math.sin(t * 2)})`;
    ctx.beginPath(); ctx.moveTo(W * 0.2, 0); ctx.lineTo(W * 0.05, H); ctx.lineTo(W * 0.45, H); ctx.fill();
    ctx.fillStyle = `rgba(${set.l2},${0.12 + 0.1 * Math.cos(t * 2.4)})`;
    ctx.beginPath(); ctx.moveTo(W * 0.8, 0); ctx.lineTo(W * 0.55, H); ctx.lineTo(W * 0.95, H); ctx.fill();
    const n = 9 + Math.floor(rnd() * 6), bw = W / n;
    for (let i = 0; i < n; i++) {
      const v = Math.abs(Math.sin(t * (2 + rnd() * 2.5) + i * 1.1)) * 0.7 + Math.abs(Math.sin(t * 5 + i * 2.3)) * 0.3;
      const bh = v * H * 0.55;
      const bg = ctx.createLinearGradient(0, H - bh, 0, H);
      bg.addColorStop(0, set.top); bg.addColorStop(1, set.bot);
      ctx.fillStyle = bg;
      ctx.fillRect(i * bw + 1.5, H - bh, bw - 3, bh);
    }
  }

  function doc(ctx, t, rnd) {
    // Время суток: день / закат / сумерки
    const set = pick(rnd, [
      { sky: [[0, "#9AD7F5"], [0.6, "#CFEDF7"], [1, "#7FC8A9"]], sun: "#FFDD7F", hill: "#2F9E44", river: "#196E82", cloud: "rgba(255,255,255,0.85)" },
      { sky: [[0, "#3A2A5E"], [0.55, "#C4633A"], [1, "#E8A23D"]], sun: "#FFB84D", hill: "#1E5A2E", river: "#0F3A4A", cloud: "rgba(255,220,190,0.7)" },
      { sky: [[0, "#16204A"], [0.6, "#37528F"], [1, "#5E7DB0"]], sun: "#E8ECFF", hill: "#12331C", river: "#0A2733", cloud: "rgba(220,228,255,0.5)" },
    ]);
    ctx.fillStyle = vgrad(ctx, set.sky); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = set.sun;
    ctx.beginPath(); ctx.arc(W * (0.6 + rnd() * 0.3), H * (0.15 + rnd() * 0.2), 6 + rnd() * 4, 0, 7); ctx.fill();
    ctx.fillStyle = set.cloud;
    for (let i = 0; i < 3; i++) {
      const x = ((t * (4 + i * 2) + rnd() * W) % (W + 70)) - 35;
      const y = H * (0.14 + i * 0.1);
      ctx.beginPath(); ctx.ellipse(x, y, 15, 5, 0, 0, 7); ctx.ellipse(x + 9, y - 3, 10, 4, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = set.hill;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.quadraticCurveTo(W * 0.3, H * 0.52, W * 0.55, H * 0.7); ctx.quadraticCurveTo(W * 0.8, H * 0.85, W, H * 0.62); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = set.river;
    ctx.beginPath(); ctx.moveTo(W * 0.42, H); ctx.quadraticCurveTo(W * 0.5, H * 0.8, W * 0.72, H); ctx.fill();
    ctx.strokeStyle = "rgba(35,38,61,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const bx = ((t * 9 + i * 60 + rnd() * 40) % (W + 30)) - 15, by = H * (0.3 + i * 0.08);
      ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.quadraticCurveTo(bx, by - 3, bx + 3, by);
      ctx.moveTo(bx + 3, by); ctx.quadraticCurveTo(bx + 6, by - 3, bx + 9, by); ctx.stroke();
    }
  }

  function talk(ctx, t, rnd) {
    const set = pick(rnd, [
      { bg: [[0, "#423C8B"], [1, "#7A73D8"]], panel: "rgba(255,255,255,0.12)" },
      { bg: [[0, "#0F4C5C"], [1, "#2F9E88"]], panel: "rgba(255,255,255,0.14)" },
      { bg: [[0, "#4A2A10"], [1, "#B07030"]], panel: "rgba(255,245,220,0.16)" },
    ]);
    ctx.fillStyle = vgrad(ctx, set.bg); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = set.panel; rr(ctx, W * 0.3, H * 0.1, W * 0.4, H * 0.34, 3);
    const guests = 2 + Math.floor(rnd() * 2);
    const left = Math.floor(t / 2.5) % guests;
    for (let i = 0; i < guests; i++) {
      const cx = W * (guests === 2 ? 0.28 + i * 0.44 : 0.2 + i * 0.3);
      const speaking = i === left;
      const bob = speaking ? Math.sin(t * 6) * 0.8 : 0;
      ctx.fillStyle = "#1A2340";
      ctx.beginPath(); ctx.arc(cx, H * 0.5 + bob, H * 0.11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, H * 0.82 + bob, H * 0.22, H * 0.2, 0, Math.PI, 0); ctx.fill();
      if (speaking) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
        const mx = cx + (cx < W / 2 ? 14 : -14);
        ctx.beginPath(); ctx.arc(mx, H * 0.5, 4 + (t * 14 % 5), -0.6, 0.6); ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(10,13,24,0.7)"; ctx.fillRect(0, H * 0.86, W, H * 0.14);
    dashes(ctx, 0, H * 0.91, 5, 18, t, "rgba(255,255,255,0.6)");
  }

  function city(ctx, t, rnd) {
    const set = pick(rnd, [
      { sky: [[0, "#0D1120"], [1, "#1A2340"]], win: "255,194,0", moon: "rgba(230,235,255,0.9)" },
      { sky: [[0, "#2A1030"], [1, "#C86A2A"]], win: "255,230,180", moon: "rgba(255,190,120,0.95)" },
      { sky: [[0, "#0D1B3A"], [1, "#3A5AA0"]], win: "200,225,255", moon: "rgba(255,255,255,0.85)" },
    ]);
    ctx.fillStyle = vgrad(ctx, set.sky); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = set.moon; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.2, 6, 0, 7); ctx.fill();
    let x = 0, b = 0;
    while (x < W) {
      const bw = 14 + rnd() * 18, bh = H * (0.3 + rnd() * 0.42);
      ctx.fillStyle = "#151B33"; ctx.fillRect(x, H - bh, bw, bh);
      for (let wy = H - bh + 3; wy < H - 4; wy += 6) {
        for (let wx = x + 2; wx < x + bw - 3; wx += 5) {
          const on = (Math.floor(wx * 7 + wy * 13 + b) + Math.floor(t / (1.5 + rnd()))) % 5 !== 0;
          ctx.fillStyle = on ? `rgba(${set.win},0.75)` : "rgba(255,255,255,0.06)";
          ctx.fillRect(wx, wy, 2, 3);
        }
      }
      x += bw + 2; b++;
    }
  }

  function ads(ctx, t, rnd) {
    const k = Math.floor(t / 2.5);
    const kr = mulberry((k + 7) * 1013 + Math.floor(rnd() * 999));
    const hue = kr() * 360;
    ctx.fillStyle = `hsl(${hue} 70% 92%)`; ctx.fillRect(0, 0, W, H);
    const p = Math.min(1, (t % 2.5) / 0.35), ease = 1 - (1 - p) * (1 - p);
    const cx = W * 0.5 - (1 - ease) * W * 0.6;
    ctx.fillStyle = "#FFFFFF"; rr(ctx, cx - 42, H * 0.18, 84, H * 0.64, 5);
    ctx.fillStyle = `hsl(${hue} 75% 55%)`;
    if (k % 3 === 0) { ctx.beginPath(); ctx.arc(cx - 18, H * 0.5, 12, 0, 7); ctx.fill(); }
    else if (k % 3 === 1) rr(ctx, cx - 30, H * 0.34, 24, 24, 3);
    else { ctx.beginPath(); ctx.moveTo(cx - 18, H * 0.3); ctx.lineTo(cx - 4, H * 0.66); ctx.lineTo(cx - 32, H * 0.66); ctx.fill(); }
    ctx.fillStyle = "rgba(35,38,61,0.55)";
    ctx.fillRect(cx + 2, H * 0.34, 30, 3); ctx.fillRect(cx + 2, H * 0.44, 24, 3); ctx.fillRect(cx + 2, H * 0.54, 27, 3);
    ctx.fillStyle = "#E50581"; rr(ctx, cx + 2, H * 0.62, 22, 10, 2);
    ctx.fillStyle = "rgba(35,38,61,0.8)";
    ctx.font = "bold 7px Manrope, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("РЕКЛАМА", W - 4, 10); ctx.textAlign = "left";
  }

  function weather(ctx, t, rnd) {
    const set = pick(rnd, [
      { bg: [["#104BBF", "#1564FF"]], land: "rgba(255,255,255,0.16)" },
      { bg: [["#0A2733", "#196E82"]], land: "rgba(255,255,255,0.14)" },
      { bg: [["#23263D", "#423C8B"]], land: "rgba(255,255,255,0.12)" },
    ]);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, set.bg[0][0]); g.addColorStop(1, set.bg[0][1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = set.land;
    ctx.beginPath(); ctx.ellipse(W * 0.3, H * 0.4, 34, 20, 0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.72, H * 0.62, 26, 16, -0.4, 0, 7); ctx.fill();
    const k = Math.floor(t / 3), temps = ["+19°", "+23°", "+17°", "+25°", "+21°"];
    ctx.fillStyle = "#FFC200";
    const px = W * (0.25 + ((k * 37) % 50) / 100), py = H * (0.3 + ((k * 23) % 40) / 100);
    ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 16px Manrope, sans-serif";
    ctx.fillText(temps[(k + Math.floor(rnd() * 5)) % temps.length], px + 7, py + 5);
    if (k % 2 === 0) { ctx.fillStyle = "#FFC200"; ctx.beginPath(); ctx.arc(W * 0.85, H * 0.16, 6, 0, 7); ctx.fill(); }
    else {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.ellipse(W * 0.85, H * 0.17, 9, 4, 0, 0, 7); ctx.ellipse(W * 0.81, H * 0.14, 6, 3.5, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "rgba(10,13,24,0.55)"; ctx.fillRect(0, H * 0.87, W, H * 0.13);
    dashes(ctx, 0, H * 0.915, 5, 14, t, "rgba(255,255,255,0.65)");
  }

  // Настроечная таблица: канал ждёт эфира. Не участвует в смене программ.
  function bars(ctx, t, rnd) {
    const cols = ["#B9B9B9", "#BDBD24", "#24BDBD", "#28B928", "#BD24BD", "#B92828", "#2828B9"];
    const bw = W / 7;
    for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(i * bw, 0, bw + 1, H * 0.68); }
    // Средний ряд: инвертированные узкие полосы
    for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[6 - i]; ctx.fillRect(i * bw, H * 0.68, bw + 1, H * 0.1); }
    // Нижний ряд: PLUGE-блоки
    const blocks = ["#0A3A8A", "#FFFFFF", "#3A0A6E", "#161616", "#0A0A0A", "#161616", "#242424"];
    const bb = W / blocks.length;
    for (let i = 0; i < blocks.length; i++) { ctx.fillStyle = blocks[i]; ctx.fillRect(i * bb, H * 0.78, bb + 1, H * 0.22); }
    // Лёгкая жизнь: бегущая CRT-полоска, фаза своя у каждого экрана
    const y = ((t * 14 + rnd() * H) % (H + 20)) - 10;
    ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(0, y, W, 3);
  }

  const PAINTERS = { news, sport, film, kids, music, doc, talk, city, ads, weather, bars };
  // В пуле смены программ настроечной таблицы нет — это стационарная заглушка
  const GENRES = Object.keys(PAINTERS).filter((g) => g !== "bars");

  const tiles = [];
  let started = false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function create(el, genre, seed) {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    el.prepend(canvas);
    const tile = {
      el, canvas,
      ctx: canvas.getContext("2d"),
      genre, seed,
      setGenre(g) { this.genre = g; this.seed = Math.floor(Math.random() * 1e9); },
    };
    tiles.push(tile);
    return tile;
  }

  function paint(tile, t) {
    // rnd пересоздаётся на кадр: одинаковая раскладка сцены, живая анимация
    const rnd = mulberry(tile.seed);
    PAINTERS[tile.genre](tile.ctx, t, rnd);
  }

  function start() {
    if (started) return;
    started = true;
    const t0 = performance.now();
    if (reduced) { // без анимации: один статичный кадр на экран
      tiles.forEach((tile) => paint(tile, 1.7));
      return;
    }
    let last = 0;
    (function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 70 || document.hidden) return; // ~14 fps, ТВ-стене хватает
      last = now;
      const t = (now - t0) / 1000;
      tiles.forEach((tile) => {
        if (tile.el.classList.contains("is-live")) paint(tile, t + (tile.seed % 100));
      });
    })(t0);
  }

  window.TVWall = { GENRES, create, start, reduced };
})();
