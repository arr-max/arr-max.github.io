class TronVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotationX = 0.55;
    this.rotationY = 0.45;
    this.zoom = 1;
    this.isMouseDown = false;
    this.lastX = 0;
    this.lastY = 0;
    this.services = { prep: false, edge: false, sealing: false, removal: false };
    this.area = 100;
    this._raf = null;

    this.resize();
    this.setupEvents();
    this.animate();
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  setupEvents() {
    const el = this.canvas;
    el.addEventListener('mousedown',  e => { this.isMouseDown = true;  this.lastX = e.clientX; this.lastY = e.clientY; });
    el.addEventListener('mousemove',  e => { if (!this.isMouseDown) return; this.drag(e.clientX - this.lastX, e.clientY - this.lastY); this.lastX = e.clientX; this.lastY = e.clientY; });
    el.addEventListener('mouseup',    () => this.isMouseDown = false);
    el.addEventListener('mouseleave', () => this.isMouseDown = false);
    el.addEventListener('touchstart', e => { this.isMouseDown = true;  this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove',  e => { if (!this.isMouseDown) return; this.drag(e.touches[0].clientX - this.lastX, e.touches[0].clientY - this.lastY); this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend',   () => this.isMouseDown = false);
    el.addEventListener('wheel',      e => { e.preventDefault(); this.zoom = Math.max(0.4, Math.min(2.5, this.zoom - e.deltaY * 0.001)); }, { passive: false });
  }

  drag(dx, dy) {
    this.rotationY += dx * 0.006;
    this.rotationX += dy * 0.006;
    this.rotationX = Math.max(-0.1, Math.min(1.4, this.rotationX));
  }

  // ─── 3D math ─────────────────────────────────────────────────────────────

  rotate(x, y, z) {
    // X-axis
    const y1 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
    const z1 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);
    // Y-axis
    const x2 = x * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
    const z2 = -x * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
    return { x: x2, y: y1, z: z2 };
  }

  project(pt) {
    const fov = 280 * this.zoom;
    const d = fov / (fov * 0.04 + pt.z + 30);
    return {
      x: this.W / 2 + pt.x * d,
      y: this.H / 2 + pt.y * d,
      d
    };
  }

  p(x, y, z) { return this.project(this.rotate(x, y, z)); }

  // ─── Draw helpers ─────────────────────────────────────────────────────────

  face(pts, fill, stroke, sw = 1) {
    if (pts.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) this.ctx.lineTo(pts[i].x, pts[i].y);
    this.ctx.closePath();
    if (fill)   { this.ctx.fillStyle = fill;     this.ctx.fill(); }
    if (stroke) { this.ctx.strokeStyle = stroke; this.ctx.lineWidth = sw; this.ctx.stroke(); }
  }

  // Draw a flat slab from y=y0 to y=y1, full width half
  slab(half, y0, y1, colors, lineColor = 'rgba(255,255,255,0.15)') {
    const { top, front, right, left } = colors;
    const { sw } = this;

    // back faces first
    this.face([this.p(-half,y0,-half), this.p(half,y0,-half), this.p(half,y1,-half), this.p(-half,y1,-half)], colors.back, lineColor, sw);
    // left
    this.face([this.p(-half,y0,-half), this.p(-half,y0,half), this.p(-half,y1,half), this.p(-half,y1,-half)], left, lineColor, sw);
    // right
    this.face([this.p(half,y0,-half), this.p(half,y0,half), this.p(half,y1,half), this.p(half,y1,-half)], right, lineColor, sw);
    // front
    this.face([this.p(-half,y0,half), this.p(half,y0,half), this.p(half,y1,half), this.p(-half,y1,half)], front, lineColor, sw);
    // top
    this.face([this.p(-half,y1,-half), this.p(half,y1,-half), this.p(half,y1,half), this.p(-half,y1,half)], top, lineColor, sw);
  }

  // Draw one curb block on one side
  curbSide(x0, z0, x1, z1, y0, y1, colors) {
    const { sw } = this;
    const lc = 'rgba(255,255,255,0.2)';
    // two faces visible
    this.face([this.p(x0,y0,z0), this.p(x1,y0,z1), this.p(x1,y1,z1), this.p(x0,y1,z0)], colors.front, lc, sw);
    this.face([this.p(x0,y1,z0), this.p(x1,y1,z1), this.p(x1,y1,z1), this.p(x0,y1,z0)], colors.top,   lc, sw);
  }

  // Label with leader line from 3D point to screen margin
  label(worldX, worldY, worldZ, text, color, price) {
    const pt = this.p(worldX, worldY, worldZ);
    const tx = this.W - 10;
    const ty = pt.y;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(pt.x, pt.y);
    this.ctx.lineTo(tx - 120, ty);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.textAlign = 'left';
    this.ctx.font = 'bold 12px Manrope, monospace';
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, tx - 118, ty - 3);
    if (price) {
      this.ctx.font = '11px Manrope, monospace';
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.fillText(price, tx - 118, ty + 12);
    }
  }

  // ─── Ground grid ─────────────────────────────────────────────────────────

  drawGrid() {
    const size = 50;
    const n = 4;
    this.ctx.strokeStyle = 'rgba(0, 255, 150, 0.12)';
    this.ctx.lineWidth = 1;
    for (let i = -n; i <= n; i++) {
      const a = this.p(i * size / n, 0, -size);
      const b = this.p(i * size / n, 0,  size);
      const c = this.p(-size, 0, i * size / n);
      const d = this.p( size, 0, i * size / n);
      this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(c.x, c.y); this.ctx.lineTo(d.x, d.y); this.ctx.stroke();
    }
  }

  // ─── Scene ───────────────────────────────────────────────────────────────

  drawScene() {
    const half = Math.sqrt(this.area) / 2;
    const labels = [];
    let y = 0;

    // ── Демонтаж (старый асфальт/плитка под площадкой) ──────────────
    if (this.services.removal) {
      const remColors = {
        top:   'rgba(80,70,60,0.85)',
        front: 'rgba(60,52,44,0.85)',
        right: 'rgba(70,60,52,0.85)',
        left:  'rgba(55,48,40,0.85)',
        back:  'rgba(50,42,36,0.85)',
      };
      this.slab(half + 1, y, y + 1.2, remColors, 'rgba(255,80,0,0.3)');

      // Трещины на поверхности
      this.ctx.strokeStyle = 'rgba(255,80,0,0.45)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([3, 5]);
      const cracks = [
        [[-half*0.6, y+1.2, -half*0.4], [half*0.3, y+1.2, half*0.5]],
        [[half*0.5, y+1.2, -half*0.7],  [-half*0.2, y+1.2, half*0.3]],
        [[-half*0.8, y+1.2, half*0.2],  [half*0.1, y+1.2, -half*0.6]],
      ];
      cracks.forEach(([a, b]) => {
        const pa = this.p(...a), pb = this.p(...b);
        this.ctx.beginPath(); this.ctx.moveTo(pa.x, pa.y); this.ctx.lineTo(pb.x, pb.y); this.ctx.stroke();
      });
      this.ctx.setLineDash([]);

      labels.push({ x: half + 1, y: y + 0.6, z: half + 1, text: 'Демонтаж', color: 'rgba(255,120,60,0.9)', price: '−1 200 ₽/м²' });
      y += 1.2;
    }

    // ── Подготовка: щебень ────────────────────────────────────────────
    if (this.services.prep) {
      const prepColors = {
        top:   'rgba(160,140,100,0.85)',
        front: 'rgba(120,105,75,0.85)',
        right: 'rgba(140,122,88,0.85)',
        left:  'rgba(115,100,72,0.85)',
        back:  'rgba(110,95,68,0.85)',
      };
      this.slab(half, y, y + 1.5, prepColors, 'rgba(255,200,100,0.3)');

      // Точки-щебень на поверхности
      const pts = this.p(0, y + 1.5, 0);
      for (let i = 0; i < 30; i++) {
        const sx = (Math.random() - 0.5) * (half * 1.6);
        const sz = (Math.random() - 0.5) * (half * 1.6);
        const sp = this.p(sx, y + 1.5, sz);
        this.ctx.fillStyle = `rgba(${140 + Math.random()*60|0},${120+Math.random()*40|0},${80+Math.random()*30|0},0.7)`;
        this.ctx.beginPath();
        this.ctx.arc(sp.x, sp.y, 1.5 + Math.random() * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      labels.push({ x: half, y: y + 0.75, z: half, text: 'Подготовка', color: 'rgba(255,200,80,0.9)', price: '+900 ₽/м²' });
      y += 1.5;
    }

    // ── Каменный ковёр ────────────────────────────────────────────────
    const stoneColors = {
      top:   'rgba(185,165,130,0.9)',
      front: 'rgba(145,128,100,0.9)',
      right: 'rgba(165,147,115,0.9)',
      left:  'rgba(138,122,96,0.9)',
      back:  'rgba(130,115,90,0.9)',
    };
    this.slab(half, y, y + 1.8, stoneColors, 'rgba(0,255,150,0.4)');

    // Каменная текстура сверху (сетка швов)
    this.ctx.strokeStyle = 'rgba(100,85,65,0.5)';
    this.ctx.lineWidth = 1;
    const gridN = 6;
    for (let i = -gridN; i <= gridN; i++) {
      const t = (i / gridN) * half * 0.9;
      const a = this.p(t, y + 1.8, -half * 0.9);
      const b = this.p(t, y + 1.8,  half * 0.9);
      const c = this.p(-half * 0.9, y + 1.8, t);
      const d = this.p( half * 0.9, y + 1.8, t);
      this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(c.x, c.y); this.ctx.lineTo(d.x, d.y); this.ctx.stroke();
    }

    const coverageLabel = document.querySelector('input[name="coverage"]:checked')?.parentElement?.querySelector('strong')?.textContent || 'Покрытие';
    const coveragePrice = document.querySelector('input[name="coverage"]:checked')?.dataset?.price;
    labels.push({ x: half, y: y + 0.9, z: half, text: `TerraWay · ${coverageLabel}`, color: 'rgba(0,255,150,0.95)', price: coveragePrice ? `${Number(coveragePrice).toLocaleString('ru-RU')} ₽/м²` : '' });
    y += 1.8;

    // ── Герметизация (тонкий глянцевый слой) ─────────────────────────
    if (this.services.sealing) {
      const sealColors = {
        top:   'rgba(120,200,255,0.55)',
        front: 'rgba(80,160,220,0.5)',
        right: 'rgba(100,180,240,0.5)',
        left:  'rgba(75,155,210,0.5)',
        back:  'rgba(70,148,200,0.5)',
      };
      this.slab(half, y, y + 0.4, sealColors, 'rgba(100,200,255,0.4)');
      labels.push({ x: half, y: y + 0.2, z: half, text: 'Герметизация', color: 'rgba(100,200,255,0.9)', price: '+1 500 ₽/м²' });
      y += 0.4;
    }

    // ── Поребрик (бордюр) — блоки по периметру ───────────────────────
    if (this.services.edge) {
      const curbH = 2.8;  // высота поребрика над основанием покрытия
      const curbW = 0.8;  // ширина поребрика
      const yBase = this.services.removal ? 1.2 : 0;  // поребрик вбивается в основание
      const curbColors = { front: 'rgba(160,160,170,0.88)', top: 'rgba(200,200,210,0.88)' };

      // Четыре стороны поребрика
      const sides = [
        // front (z = +half): x идет от -half до half
        { x0: -half - curbW, z0: half, x1: half + curbW, z1: half + curbW },
        // back  (z = -half)
        { x0: -half - curbW, z0: -half - curbW, x1: half + curbW, z1: -half },
        // left  (x = -half)
        { x0: -half - curbW, z0: -half, x1: -half, z1: half },
        // right (x = +half)
        { x0: half, z0: -half, x1: half + curbW, z1: half },
      ];

      sides.forEach(s => {
        // top face
        this.face([
          this.p(s.x0, yBase + curbH, s.z0),
          this.p(s.x1, yBase + curbH, s.z0),
          this.p(s.x1, yBase + curbH, s.z1),
          this.p(s.x0, yBase + curbH, s.z1),
        ], curbColors.top, 'rgba(255,255,255,0.2)', 1);

        // front face (always z-positive side)
        this.face([
          this.p(s.x0, yBase,         s.z1),
          this.p(s.x1, yBase,         s.z1),
          this.p(s.x1, yBase + curbH, s.z1),
          this.p(s.x0, yBase + curbH, s.z1),
        ], curbColors.front, 'rgba(255,255,255,0.2)', 1);
      });

      labels.push({ x: half + curbW, y: yBase + curbH * 0.5, z: half, text: 'Поребрик', color: 'rgba(200,200,220,0.9)', price: '+750 ₽/п.м' });
    }

    // ── Линии-выноски ─────────────────────────────────────────────────
    labels.forEach(l => this.label(l.x, l.y, l.z, l.text, l.color, l.price));
  }

  // ─── Render loop ──────────────────────────────────────────────────────────

  animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    // Dark bg gradient
    const bg = ctx.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, '#0d1117');
    bg.addColorStop(1, '#111820');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    this.sw = Math.min(1, this.W / 600);
    this.drawGrid();
    this.drawScene();

    this._raf = requestAnimationFrame(() => this.animate());
  }

  updateServices(services, area) {
    this.services = services;
    this.area = Math.max(4, area);
  }

  resize() {
    this.W = this.canvas.offsetWidth  || 600;
    this.H = this.canvas.offsetHeight || 400;
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
  }
}

window.TronVisualization = TronVisualization;
