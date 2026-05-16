class TronVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotationX = 0.55;
    this.rotationY = 0.45;
    this.zoom = 2.2;
    this.isMouseDown = false;
    this.lastX = 0;
    this.lastY = 0;
    this.services = { prep: false, edge: false, sealing: false, removal: false, baseType: 'hard' };
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
    el.addEventListener('wheel',      e => { e.preventDefault(); this.zoom = Math.max(0.8, Math.min(6, this.zoom - e.deltaY * 0.003)); }, { passive: false });
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

  // Draw legend panel from collected labels array
  drawLegend(labels) {
    if (!labels.length) return;
    const ctx = this.ctx;
    const rowH = 36;
    const padX = 14, padY = 10;
    const dotR = 5;
    const panelW = 190;
    const panelH = labels.length * rowH + padY * 2;
    const px = this.W - panelW - 12;
    const py = this.H - panelH - 12;

    // Panel background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 8);
    ctx.fillStyle = 'rgba(10,14,22,0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Leader lines then rows
    labels.forEach((l, i) => {
      const rowCY = py + padY + i * rowH + rowH / 2;
      const dotX  = px + padX + dotR;
      const pt     = this.p(l.wx, l.wy, l.wz);

      // Dashed leader line from 3D anchor to panel dot
      ctx.save();
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(dotX, rowCY);
      ctx.stroke();
      ctx.restore();

      // Dot
      ctx.beginPath();
      ctx.arc(dotX, rowCY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.fill();

      // Name
      ctx.font = 'bold 12px Manrope, system-ui, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(l.text, px + padX + dotR * 2 + 8, rowCY - 4);

      // Price
      if (l.price) {
        ctx.font = '11px Manrope, system-ui, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(l.price, px + padX + dotR * 2 + 8, rowCY + 10);
      }
    });
  }

  // ─── Ground grid ─────────────────────────────────────────────────────────

  drawGrid() {
    const size = 20;
    const n = 5;
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
    // Фиксированный визуальный размер — площадь показывается в подписи
    const half = 12;
    const labels = [];
    let y = 0;

    // ── Слой основания (под всеми слоями) ────────────────────────────
    const isSoft = this.services.baseType === 'soft';
    const baseDepth = isSoft ? 2.2 : 1.0;
    if (isSoft) {
      // Мягкое: грунт/отсев — бежево-серый слой с крапинками
      const softColors = {
        top:   'rgba(180,165,130,0.80)',
        front: 'rgba(145,130,100,0.80)',
        right: 'rgba(162,148,115,0.80)',
        left:  'rgba(138,124,96,0.80)',
        back:  'rgba(130,118,90,0.80)',
      };
      this.slab(half + 2, -baseDepth, 0, softColors, 'rgba(200,180,130,0.20)');
      // Крапинки — отсев/гравий
      for (let i = 0; i < 40; i++) {
        const sx = (Math.random() - 0.5) * (half * 2.2);
        const sz = (Math.random() - 0.5) * (half * 2.2);
        const sp = this.p(sx, 0, sz);
        const br = 100 + Math.random() * 60 | 0;
        this.ctx.fillStyle = `rgba(${br},${br - 20},${br - 50},0.55)`;
        this.ctx.beginPath();
        this.ctx.arc(sp.x, sp.y, 1 + Math.random() * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      labels.push({ wx: -(half + 2), wy: -baseDepth / 2, wz: -(half + 2), text: 'Основание: мягкое', color: 'rgba(210,185,130,0.90)', price: 'отсев / грунт · 18–50 мм' });
    } else {
      // Твёрдое: бетонная плита — серый слой с сеткой
      const hardColors = {
        top:   'rgba(160,165,170,0.85)',
        front: 'rgba(120,125,130,0.85)',
        right: 'rgba(140,145,150,0.85)',
        left:  'rgba(115,120,125,0.85)',
        back:  'rgba(110,115,120,0.85)',
      };
      this.slab(half + 2, -baseDepth, 0, hardColors, 'rgba(180,190,200,0.15)');
      // Бетонная сетка (арматура) на поверхности
      this.ctx.strokeStyle = 'rgba(100,110,120,0.35)';
      this.ctx.lineWidth = 0.8;
      const gN = 4;
      for (let i = -gN; i <= gN; i++) {
        const t = (i / gN) * (half + 2) * 0.9;
        const a = this.p(t, 0, -(half + 2) * 0.9);
        const b = this.p(t, 0,  (half + 2) * 0.9);
        const c = this.p(-(half + 2) * 0.9, 0, t);
        const d = this.p( (half + 2) * 0.9, 0, t);
        this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(c.x, c.y); this.ctx.lineTo(d.x, d.y); this.ctx.stroke();
      }
      labels.push({ wx: -(half + 2), wy: -baseDepth / 2, wz: -(half + 2), text: 'Основание: твёрдое', color: 'rgba(180,185,200,0.90)', price: 'бетон / плитка · 10–30 мм' });
    }

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

      labels.push({ wx: half + 1, wy: y + 0.6, wz: half + 1, text: 'Демонтаж', color: 'rgba(255,120,60,0.9)', price: '−1 200 ₽/м²' });
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

      labels.push({ wx: half, wy: y + 0.75, wz: half, text: 'Подготовка', color: 'rgba(255,200,80,0.9)', price: '+900 ₽/м²' });
      y += 1.5;
    }

    // ── Каменный ковёр ────────────────────────────────────────────────
    // Толщина зависит от основания: твёрдое = 1.2, мягкое = 2.4 (×2 для наглядности)
    const stoneThickness = this.services.baseType === 'soft' ? 2.4 : 1.2;
    const stoneColors = {
      top:   'rgba(185,165,130,0.9)',
      front: 'rgba(145,128,100,0.9)',
      right: 'rgba(165,147,115,0.9)',
      left:  'rgba(138,122,96,0.9)',
      back:  'rgba(130,115,90,0.9)',
    };
    this.slab(half, y, y + stoneThickness, stoneColors, 'rgba(0,255,150,0.4)');

    // Каменная текстура сверху (сетка швов)
    this.ctx.strokeStyle = 'rgba(100,85,65,0.5)';
    this.ctx.lineWidth = 1;
    const gridN = 6;
    for (let i = -gridN; i <= gridN; i++) {
      const t = (i / gridN) * half * 0.9;
      const a = this.p(t, y + stoneThickness, -half * 0.9);
      const b = this.p(t, y + stoneThickness,  half * 0.9);
      const c = this.p(-half * 0.9, y + stoneThickness, t);
      const d = this.p( half * 0.9, y + stoneThickness, t);
      this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(c.x, c.y); this.ctx.lineTo(d.x, d.y); this.ctx.stroke();
    }

    const coverageLabel = document.querySelector('input[name="coverage"]:checked')?.parentElement?.querySelector('strong')?.textContent || 'Покрытие';
    const coveragePrice = document.querySelector('input[name="coverage"]:checked')?.dataset?.price;
    const baseRadio = document.querySelector('input[name="base"]:checked');
    const baseLabel = baseRadio?.parentElement?.querySelector('strong')?.textContent || '';
    const baseThickness = baseRadio?.dataset?.thickness || '';
    const baseMult = parseFloat(baseRadio?.dataset?.multiplier) || 1;
    const finalPrice = coveragePrice ? Math.round(Number(coveragePrice) * baseMult) : 0;
    labels.push({
      wx: half, wy: y + stoneThickness / 2, wz: half,
      text: `TerraWay · ${coverageLabel}`,
      color: 'rgba(0,255,150,0.95)',
      price: finalPrice ? `${finalPrice.toLocaleString('ru-RU')} ₽/м² · осн. ${baseLabel.toLowerCase()} ${baseThickness}` : ''
    });
    y += stoneThickness;

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
      labels.push({ wx: half, wy: y + 0.2, wz: half, text: 'Герметизация', color: 'rgba(100,200,255,0.9)', price: '+1 500 ₽/м²' });
      y += 0.4;
    }

    // ── Поребрик — все 4 стороны с углами ────────────────────────────
    if (this.services.edge) {
      const curbH = 3.0;
      const curbW = 1.0;
      const yBase = this.services.removal ? 1.2 : 0;
      const yTop  = yBase + curbH;
      const H = half + curbW;

      // Рисует один ящик: top, front, right, back, left
      const curbBox = (x0, x1, z0, z1) => {
        const lc = 'rgba(255,255,255,0.18)';
        const top   = 'rgba(210,210,220,0.9)';
        const side1 = 'rgba(155,155,165,0.9)';
        const side2 = 'rgba(135,135,145,0.9)';
        // top
        this.face([this.p(x0,yTop,z0),this.p(x1,yTop,z0),this.p(x1,yTop,z1),this.p(x0,yTop,z1)], top,   lc, 1);
        // front (+z)
        this.face([this.p(x0,yBase,z1),this.p(x1,yBase,z1),this.p(x1,yTop,z1),this.p(x0,yTop,z1)], side1, lc, 1);
        // back (-z)
        this.face([this.p(x0,yBase,z0),this.p(x1,yBase,z0),this.p(x1,yTop,z0),this.p(x0,yTop,z0)], side2, lc, 1);
        // right (+x)
        this.face([this.p(x1,yBase,z0),this.p(x1,yBase,z1),this.p(x1,yTop,z1),this.p(x1,yTop,z0)], side1, lc, 1);
        // left (-x)
        this.face([this.p(x0,yBase,z0),this.p(x0,yBase,z1),this.p(x0,yTop,z1),this.p(x0,yTop,z0)], side2, lc, 1);
      };

      // Передняя сторона (+z)
      curbBox(-H,  H,   half, H);
      // Задняя сторона (-z)
      curbBox(-H,  H,  -H,  -half);
      // Левая сторона (-x)
      curbBox(-H, -half, -half, half);
      // Правая сторона (+x)
      curbBox( half, H,  -half, half);

      labels.push({ wx: H, wy: yBase + curbH * 0.5, wz: half, text: 'Поребрик', color: 'rgba(210,210,230,0.95)', price: '+750 ₽/п.м' });
    }

    // ── Легенда ───────────────────────────────────────────────────────
    this.drawLegend(labels);
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
