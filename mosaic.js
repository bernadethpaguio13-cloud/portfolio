/* Mosaic portrait: a photo rebuilt from tiny frames of Bernadeth's own videos.
   Tiles scatter away from the pointer and spring back. */
(function () {
  const canvas = document.getElementById('mosaic');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TW = 36, TH = 64, COLS = 8, COUNT = 32;
  const portrait = new Image();
  const sprite = new Image();
  let ready = 0, parts = [], W = 0, H = 0, dpr = 1, raf = 0, visible = true, t0 = 0;
  const pointer = { x: -9999, y: -9999, on: false };

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

  function build() {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !portrait.naturalWidth) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(box.width); H = Math.round(box.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = W < 520 ? 56 : W < 800 ? 74 : 100;
    const cell = W / cols;
    const rows = Math.ceil(H / cell);
    // fit the portrait to the canvas (cover, anchored to the top so the face stays in frame)
    const pr = portrait.naturalWidth / portrait.naturalHeight;
    let dw = cols, dh = cols / pr;
    if (dh < rows) { dh = rows; dw = rows * pr; }
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.fillStyle = '#000'; o.fillRect(0, 0, cols, rows);
    o.drawImage(portrait, (cols - dw) / 2, 0, dw, dh);
    const data = o.getImageData(0, 0, cols, rows).data;

    // estimate the plain backdrop colour from the two top corners
    const bgc = [0, 0, 0]; let bn = 0;
    [[0, 0], [cols - 3, 0]].forEach(([cx, cy]) => {
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
        const j = ((cy + yy) * cols + cx + xx) * 4;
        bgc[0] += data[j]; bgc[1] += data[j + 1]; bgc[2] += data[j + 2]; bn++;
      }
    });
    bgc[0] /= bn; bgc[1] /= bn; bgc[2] /= bn;

    parts = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const pr_ = data[i], pg_ = data[i + 1], pb_ = data[i + 2];
        // subject mask = how different the pixel is from the backdrop
        const diff = Math.hypot(pr_ - bgc[0], pg_ - bgc[1], pb_ - bgc[2]) / 255;
        const sat = (Math.max(pr_, pg_, pb_) - Math.min(pr_, pg_, pb_)) / 255;
        // keep skin and hair too: they are more colourful than the grey backdrop
        const mask = Math.max(smooth(0.04, 0.16, diff), smooth(0.07, 0.2, sat));
        const l = (0.2126 * pr_ + 0.7152 * pg_ + 0.0722 * pb_) / 255;
        const tone = Math.pow(Math.min(1, Math.max(0, (l - 0.1) / 0.5)), 1.15);
        // fade the edges so the face emerges from the dark
        const nx = (x / cols - 0.5) / 0.5, ny = (y / rows - 0.46) / 0.62;
        const vig = 1 - smooth(0.7, 1.15, Math.hypot(nx, ny));
        const lum = mask * (0.1 + 0.9 * tone) * vig;
        if (lum < 0.13) continue;
        const hx = (x + 0.5) * cell, hy = (y + 0.5) * cell;
        const a = hash(x * 31 + y * 17) * 6.283, r = 80 + hash(x * 7 + y * 13) * 260;
        parts.push({
          hx, hy, x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r, vx: 0, vy: 0,
          s: cell * (0.55 + 0.95 * lum), al: 0.3 + 0.7 * lum,
          tile: Math.floor(hash(x * 3 + y * 101) * COUNT), d: hash(x + y * 57) * 0.9
        });
      }
    }
    t0 = performance.now();
    if (reduce) { parts.forEach(p => { p.x = p.hx; p.y = p.hy; }); draw(1); }
  }

  function draw(intro) {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const k = intro >= 1 ? 1 : Math.min(1, Math.max(0, (intro * 1.9 - p.d)));
      if (k <= 0) continue;
      const h = p.s, w = h * (TW / TH);
      ctx.globalAlpha = p.al * k;
      const sx = (p.tile % COLS) * TW, sy = Math.floor(p.tile / COLS) * TH;
      ctx.drawImage(sprite, sx, sy, TW, TH, p.x - w / 2, p.y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const intro = Math.min(1, (now - t0) / 1800);
    const R = Math.max(70, W * 0.11), R2 = R * R;
    let moving = intro < 1;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (pointer.on) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * 5.5;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      const ease = intro < 1 ? 0.06 : 0.09;
      p.vx += (p.hx - p.x) * ease; p.vy += (p.hy - p.y) * ease;
      p.vx *= 0.8; p.vy *= 0.8;
      p.x += p.vx; p.y += p.vy;
      if (!moving && (Math.abs(p.vx) > 0.02 || Math.abs(p.vy) > 0.02)) moving = true;
    }
    draw(intro);
    if (moving || pointer.on) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = true; kick();
  }
  const stage = canvas.parentElement;
  stage.addEventListener('pointermove', setPointer);
  stage.addEventListener('pointerleave', () => { pointer.on = false; pointer.x = pointer.y = -9999; kick(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  }
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); kick(); }, 150); });

  function done() { if (++ready === 2) { build(); if (!reduce) kick(); } }
  portrait.onload = done; sprite.onload = done;
  portrait.src = canvas.dataset.portrait || 'media/portrait.jpg';
  sprite.src = 'media/tiles.jpg';
})();
