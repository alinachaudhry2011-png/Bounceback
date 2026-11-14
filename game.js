const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const EX = W / 2;
const EY = H + 400;
const ER = 490;

const rock = { x: W / 2, y: 100, vx: 0, vy: 0, r: 18, ang: 0, spin: 0.03, shape: [] };
for (let i = 0; i < 11; i++) rock.shape.push(0.75 + Math.random() * 0.35);

const GRAVITY = 0.35;
const PAD_LIFE = 180;
const LEVELS = [
  { name: "EASY", gap: 110, speed: 2, pads: 4 },
  { name: "NORMAL", gap: 90, speed: 2.5, pads: 3 },
  { name: "HARD", gap: 65, speed: 3.2, pads: 2 }
];
const pads = [];
const gems = [];
const mines = [];
const parts = [];
const pops = [];
const trail = [];
const bgStars = [];
const meteors = [];

let state = "start";
let level = 1;
let score = 0;
let best = 0;
let newBest = false;
let combo = 0;
let nextRescue = 10;
let frame = 0;
let time = 0;
let rescue = 1;
let flash = 0;
let shake = 0;
let boomT = 0;
let boomX = 0;
let boomY = 0;

try {
  const saved = localStorage.getItem("bounceback-level");
  if (saved !== null && LEVELS[Number(saved)]) level = Number(saved);
} catch (e) {}

function loadBest() {
  try {
    best = Number(localStorage.getItem("bounceback-best-" + level)) || 0;
  } catch (e) {
    best = 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem("bounceback-best-" + level, String(best));
  } catch (e) {}
}

function setLevel(i) {
  level = i;
  try {
    localStorage.setItem("bounceback-level", String(i));
  } catch (e) {}
  loadBest();
  beep(660, 0.08, "triangle");
}
loadBest();

function rand(a, b) {
  return a + Math.random() * (b - a);
}

for (let i = 0; i < 90; i++) {
  bgStars.push({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.8), tw: rand(0, 6) });
}

function groundY(x) {
  const dx = Math.min(Math.abs(x - EX), ER - 1);
  return EY - Math.sqrt(ER * ER - dx * dx);
}

function multiplier() {
  return Math.min(5, 1 + Math.floor(combo / 3));
}

let audioCtx = null;
function beep(freq, dur, type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(now + dur);
  } catch (e) {}
}

function burst(x, y, color, n, speed, life) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(0.3, 1) * speed;
    parts.push({
      x: x, y: y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life, max: life, color: color, size: rand(2, 5)
    });
  }
}

function reset() {
  rock.x = W / 2;
  rock.y = 100;
  rock.vx = 0;
  rock.vy = 0;
  pads.length = 0;
  gems.length = 0;
  mines.length = 0;
  parts.length = 0;
  pops.length = 0;
  trail.length = 0;
  score = 0;
  combo = 0;
  nextRescue = 10;
  frame = 0;
  rescue = 1;
  flash = 0;
  shake = 0;
  boomT = 0;
  newBest = false;
}

canvas.addEventListener("pointerdown", (e) => {
  if (state === "boom") return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);

  if (state !== "play") {
    if (y > 490 && y < 545) {
      const i = Math.floor((x - 25) / 140);
      if (i >= 0 && i < 3) setLevel(i);
      return;
    }
    reset();
    state = "play";
    beep(440, 0.15);
    return;
  }

  pads.push({ x: x - 40, y: y, w: 80, h: 10, life: PAD_LIFE });
  if (pads.length > LEVELS[level].pads) pads.shift();
});

function near(a, b, d) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < d * d;
}

function updateParts() {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.x += q.vx;
    q.y += q.vy;
    q.vx *= 0.985;
    q.vy *= 0.985;
    q.life--;
    if (q.life <= 0) parts.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    pops[i].y -= 1;
    pops[i].life--;
    if (pops[i].life <= 0) pops.splice(i, 1);
  }
}

function explodeEarth() {
  newBest = score > best;
  best = Math.max(best, score);
  saveBest();
  state = "boom";
  boomT = 0;
  boomX = rock.x;
  boomY = groundY(rock.x);
  shake = 30;
  burst(boomX, boomY, "#ffb347", 80, 9, 100);
  burst(boomX, boomY, "#ff4d2e", 60, 7, 100);
  burst(boomX, boomY, "#fff3c4", 40, 11, 70);
  burst(boomX, boomY, "#4aa3ff", 40, 8, 110);
  burst(boomX, boomY, "#4cd964", 30, 6, 110);
  beep(70, 0.9, "sawtooth");
  beep(45, 1.2, "square");
}

function update() {
  frame++;
  const lv = LEVELS[level];

  if (frame % 60 === 0) gems.push({ x: rand(20, W - 20), y: -10, r: 12 });
  const gap = Math.max(25, lv.gap - score * 2);
  if (frame % gap === 0) mines.push({ x: rand(25, W - 25), y: -20, r: 14 });

  rock.vy += GRAVITY;
  rock.y += rock.vy;
  rock.x += rock.vx;
  rock.ang += rock.spin + rock.vx * 0.01;
  if (rock.x < rock.r) {
    rock.x = rock.r;
    rock.vx *= -1;
  }
  if (rock.x > W - rock.r) {
    rock.x = W - rock.r;
    rock.vx *= -1;
  }

  trail.push({ x: rock.x, y: rock.y });
  if (trail.length > 14) trail.shift();

  for (const p of pads) {
    p.life--;
    const hitX = rock.x > p.x && rock.x < p.x + p.w;
    const hitY = rock.y + rock.r >= p.y && rock.y + rock.r <= p.y + p.h + rock.vy;
    if (rock.vy > 0 && hitX && hitY) {
      rock.vy = -13;
      rock.vx = (rock.x - (p.x + p.w / 2)) * 0.12;
      combo++;
      burst(rock.x, p.y, "#7cf9ff", 8, 3, 25);
      beep(400 + Math.min(combo, 10) * 60, 0.1);
    }
  }
  for (let i = pads.length - 1; i >= 0; i--) {
    if (pads[i].life <= 0) pads.splice(i, 1);
  }

  for (let i = gems.length - 1; i >= 0; i--) {
    gems[i].y += lv.speed;
    if (near(rock, gems[i], rock.r + gems[i].r)) {
      const m = multiplier();
      score += m;
      if (score >= nextRescue) {
        rescue = 1;
        nextRescue += 10;
      }
      pops.push({ x: gems[i].x, y: gems[i].y, text: "+" + m, life: 40 });
      burst(gems[i].x, gems[i].y, "#fff3a0", 12, 3, 25);
      beep(900, 0.08, "triangle");
      gems.splice(i, 1);
    } else if (gems[i].y > H + 20) {
      gems.splice(i, 1);
    }
  }

  for (let i = mines.length - 1; i >= 0; i--) {
    mines[i].y += lv.speed;
    if (near(rock, mines[i], rock.r + mines[i].r)) {
      score = 0;
      combo = 0;
      nextRescue = 10;
      flash = 15;
      shake = 12;
      burst(mines[i].x, mines[i].y, "#ff4d6d", 16, 4, 30);
      beep(110, 0.25, "sawtooth");
      mines.splice(i, 1);
    } else if (mines[i].y > H + 20) {
      mines.splice(i, 1);
    }
  }

  const gy = groundY(rock.x);
  if (rock.y + rock.r > gy) {
    if (rescue > 0) {
      rescue--;
      combo = 0;
      rock.y = gy - rock.r;
      rock.vy = -18;
      flash = 20;
      shake = 10;
      burst(rock.x, gy, "#7cf9ff", 24, 5, 30);
      beep(260, 0.3, "triangle");
    } else {
      explodeEarth();
    }
  }

  updateParts();
  if (flash > 0) flash--;
}

function updateBoom() {
  boomT++;
  updateParts();
  if (boomT > 150) state = "over";
}

function glow(color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow() {
  ctx.shadowBlur = 0;
}

function drawGem(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function centerText(text, y, size, color) {
  glow(color, 18);
  ctx.fillStyle = color;
  ctx.font = "bold " + size + "px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, y);
  noGlow();
}

function drawLevels() {
  for (let i = 0; i < 3; i++) {
    const bx = 25 + i * 140;
    const on = i === level;
    glow("#7cf9ff", on ? 16 : 0);
    ctx.strokeStyle = on ? "#7cf9ff" : "#556677";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, 495, 130, 45);
    noGlow();
    ctx.fillStyle = on ? "#7cf9ff" : "#889999";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(LEVELS[i].name, bx + 65, 523);
  }
}

function drawMeteors() {
  if (Math.random() < 0.05) {
    meteors.push({
      x: rand(0, W + 200), y: -20,
      vx: rand(-6, -3), vy: rand(5, 9), len: rand(40, 90)
    });
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.x += m.vx;
    m.y += m.vy;
    const d = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
    const tx = m.x - (m.vx / d) * m.len;
    const ty = m.y - (m.vy / d) * m.len;
    const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, "rgba(255, 220, 160, 0.9)");
    g.addColorStop(1, "rgba(255, 120, 40, 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    if (m.y > H + 100 || m.x < -100) meteors.splice(i, 1);
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#02010a");
  g.addColorStop(1, "#0a1030");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of bgStars) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.03 + s.tw));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawEarth() {
  glow("#4aa3ff", 40);
  const g = ctx.createRadialGradient(EX, EY - ER * 0.7, 40, EX, EY, ER);
  g.addColorStop(0, "#3b8bff");
  g.addColorStop(1, "#0b2a6b");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(EX, EY, ER, 0, Math.PI * 2);
  ctx.fill();
  noGlow();

  ctx.save();
  ctx.beginPath();
  ctx.arc(EX, EY, ER, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#3fae5a";
  for (let i = 0; i < 5; i++) {
    const bx = ((i * 170 + time * 0.15) % (W + 200)) - 100;
    ctx.beginPath();
    ctx.ellipse(bx, H - 45 + (i % 2) * 22, 70, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(150, 210, 255, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(EX, EY, ER, 0, Math.PI * 2);
  ctx.stroke();

  if (rescue > 0 || flash > 0) {
    glow("#7cf9ff", 25);
    ctx.strokeStyle = flash > 0 ? "#ffffff" : "rgba(124, 249, 255, 0.7)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(EX, EY, ER + 14, Math.PI * 1.3, Math.PI * 1.7);
    ctx.stroke();
    noGlow();
  }
}

function drawRock() {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.ang);
  glow("#ff8a3d", 22);
  ctx.fillStyle = "#8a7d72";
  ctx.beginPath();
  for (let i = 0; i < rock.shape.length; i++) {
    const a = (i / rock.shape.length) * Math.PI * 2;
    const px = Math.cos(a) * rock.r * rock.shape[i];
    const py = Math.sin(a) * rock.r * rock.shape[i];
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  noGlow();
  ctx.strokeStyle = "#c9b8a6";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#5e544b";
  ctx.beginPath();
  ctx.arc(-5, -4, 4, 0, Math.PI * 2);
  ctx.arc(6, 5, 3, 0, Math.PI * 2);
  ctx.arc(3, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoom() {
  const t = boomT;
  const a = Math.max(0, 1 - t / 130);
  const rad = Math.min(t * 7, 420) + 1;
  const g = ctx.createRadialGradient(boomX, boomY, 0, boomX, boomY, rad);
  g.addColorStop(0, "rgba(255, 255, 220, " + a + ")");
  g.addColorStop(0.4, "rgba(255, 150, 40, " + a * 0.8 + ")");
  g.addColorStop(1, "rgba(255, 40, 0, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(boomX, boomY, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 220, 180, " + a + ")";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(boomX, boomY, t * 10, 0, Math.PI * 2);
  ctx.stroke();
  if (t < 8) {
    ctx.fillStyle = "rgba(255, 255, 255, " + (8 - t) / 8 + ")";
    ctx.fillRect(0, 0, W, H);
  }
}

function draw() {
  ctx.save();
  if (shake > 0.5) {
    ctx.translate(rand(-shake, shake), rand(-shake, shake));
    shake *= 0.9;
  }

  drawBackground();
  drawMeteors();
  const alive = state === "start" || state === "play";
  if (alive || boomT < 5) drawEarth();

  if (flash > 0) {
    ctx.fillStyle = "rgba(124, 249, 255, 0.15)";
    ctx.fillRect(0, 0, W, H);
  }

  for (const p of pads) {
    ctx.globalAlpha = p.life / PAD_LIFE;
    glow("#7cf9ff", 18);
    ctx.fillStyle = "#7cf9ff";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    noGlow();
  }
  ctx.globalAlpha = 1;

  glow("#fff3a0", 16);
  ctx.fillStyle = "#fff3a0";
  for (const s of gems) drawGem(s.x, s.y, s.r);
  noGlow();

  for (const m of mines) {
    glow("#ff2a4d", 16);
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 3;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + time * 0.03;
      ctx.beginPath();
      ctx.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
      ctx.lineTo(m.x + Math.cos(a) * (m.r + 7), m.y + Math.sin(a) * (m.r + 7));
      ctx.stroke();
    }
    ctx.fillStyle = "#2a0610";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    noGlow();
  }

  if (alive) {
    for (let i = 0; i < trail.length; i++) {
      ctx.globalAlpha = (i / trail.length) * 0.5;
      ctx.fillStyle = "#ff8a3d";
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, rock.r * (i / trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawRock();
  }

  if (state === "boom" || state === "over") drawBoom();

  for (const q of parts) {
    ctx.globalAlpha = q.life / q.max;
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  for (const p of pops) {
    ctx.globalAlpha = p.life / 40;
    ctx.fillStyle = "#fff3a0";
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  glow("#ffffff", 8);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px monospace";
  ctx.fillText("Score: " + score, 12, 30);
  noGlow();
  ctx.fillStyle = rescue > 0 ? "#7cf9ff" : "#666666";
  ctx.fillText("Shield: " + (rescue > 0 ? "READY" : "down"), 12, 58);
  if (state === "play" && combo > 0) {
    glow("#ffb347", 14);
    ctx.fillStyle = "#ffb347";
    ctx.fillText("x" + multiplier() + " combo " + combo, 12, 86);
    noGlow();
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(LEVELS[level].name, W - 12, 30);
  ctx.fillStyle = "#fff3a0";
  ctx.fillText("Best: " + best, W - 12, 58);

  if (state === "start") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, W, H);
    centerText("BOUNCEBACK", 230, 48, "#ffb347");
    centerText("An asteroid is falling to Earth!", 300, 17, "#ffffff");
    centerText("Tap to place shields", 335, 17, "#ffffff");
    centerText("and bounce it back to space.", 360, 17, "#ffffff");
    centerText("Grab stars. Dodge mines.", 395, 17, "#ffffff");
    centerText("Chain bounces for a combo!", 420, 17, "#ffb347");
    centerText("Tap anywhere to start", 470, 22, "#7cf9ff");
    drawLevels();
  }

  if (state === "over") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    centerText("EARTH DESTROYED", 250, 34, "#ff4d2e");
    centerText("Score: " + score, 310, 24, "#ffffff");
    centerText("Best: " + best, 345, 24, "#ffffff");
    if (newBest) centerText("NEW BEST!", 385, 24, "#fff3a0");
    centerText("Tap to bounce back", 450, 22, "#7cf9ff");
    drawLevels();
  }

  ctx.restore();
}

function loop() {
  time++;
  if (state === "play") update();
  if (state === "boom") updateBoom();
  draw();
  requestAnimationFrame(loop);
}
loop();