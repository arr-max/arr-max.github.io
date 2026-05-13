// Tron-style 3D visualization
class TronVisualization {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.offsetWidth;
    this.height = canvas.offsetHeight;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Camera/rotation
    this.rotationX = 0.5;
    this.rotationY = 0.5;
    this.rotationZ = 0;
    this.zoom = 1;

    // State
    this.services = {
      prep: false,
      edge: false,
      sealing: false,
      removal: false
    };
    this.area = 100;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    // Mouse
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
    this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);

    // Touch
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', () => this.isMouseDown = false);

    // Wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(0.5, Math.min(3, this.zoom));
    });
  }

  handleMouseDown(e) {
    this.isMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  handleMouseMove(e) {
    if (!this.isMouseDown) return;
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    this.rotationY += deltaX * 0.005;
    this.rotationX += deltaY * 0.005;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  handleTouchStart(e) {
    this.isMouseDown = true;
    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  handleTouchMove(e) {
    if (!this.isMouseDown) return;
    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;
    this.rotationY += deltaX * 0.005;
    this.rotationX += deltaY * 0.005;
    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  updateServices(services, area) {
    this.services = services;
    this.area = area;
  }

  // 3D point rotation and projection
  rotatePoint(x, y, z) {
    // Rotate around X
    let y2 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
    let z2 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);

    // Rotate around Y
    let x2 = x * Math.cos(this.rotationY) + z2 * Math.sin(this.rotationY);
    let z3 = -x * Math.sin(this.rotationY) + z2 * Math.cos(this.rotationY);

    // Rotate around Z
    let x3 = x2 * Math.cos(this.rotationZ) - y2 * Math.sin(this.rotationZ);
    let y3 = x2 * Math.sin(this.rotationZ) + y2 * Math.cos(this.rotationZ);

    return { x: x3, y: y3, z: z3 };
  }

  project(point) {
    const scale = 200 / (8 + point.z * 0.1) * this.zoom;
    return {
      x: this.width / 2 + point.x * scale,
      y: this.height / 2 + point.y * scale,
      scale: scale
    };
  }

  drawGuidGrid() {
    this.ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
    this.ctx.lineWidth = 1;

    const size = 10;
    const count = 5;

    for (let i = -count; i <= count; i++) {
      for (let j = -count; j <= count; j++) {
        const p1 = this.rotatePoint(i * size, 0, j * size);
        const p2 = this.rotatePoint((i + 1) * size, 0, j * size);
        const p3 = this.rotatePoint(i * size, 0, (j + 1) * size);

        const proj1 = this.project(p1);
        const proj2 = this.project(p2);
        const proj3 = this.project(p3);

        this.ctx.beginPath();
        this.ctx.moveTo(proj1.x, proj1.y);
        this.ctx.lineTo(proj2.x, proj2.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(proj1.x, proj1.y);
        this.ctx.lineTo(proj3.x, proj3.y);
        this.ctx.stroke();
      }
    }
  }

  drawBase() {
    const sideLength = Math.sqrt(this.area);
    const half = sideLength / 2;

    // Base platform
    const corners = [
      { x: -half, y: 0, z: -half },
      { x: half, y: 0, z: -half },
      { x: half, y: 0, z: half },
      { x: -half, y: 0, z: half }
    ];

    const projected = corners.map(c => this.project(this.rotatePoint(c.x, c.y, c.z)));

    // Draw base platform
    this.ctx.strokeStyle = 'rgba(0, 255, 150, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      this.ctx.lineTo(projected[i].x, projected[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();

    // Fill with transparency
    this.ctx.fillStyle = 'rgba(0, 255, 150, 0.05)';
    this.ctx.fill();
  }

  drawLayers() {
    const sideLength = Math.sqrt(this.area);
    const half = sideLength / 2;

    let currentHeight = 0;

    // Демонтаж - нижний слой (старое покрытие)
    if (this.services.removal) {
      this.drawBox(half, currentHeight, currentHeight + 0.4, 'rgba(200, 100, 50, 0.5)');
      this.drawCrackedSurface(half, currentHeight + 0.4);
      currentHeight += 0.4;
    }

    // Подготовка основания
    if (this.services.prep) {
      this.drawBox(half, currentHeight, currentHeight + 0.5, 'rgba(255, 150, 0, 0.5)');
      currentHeight += 0.5;
    }

    // Основное покрытие (каменные ковры)
    this.drawBox(half, currentHeight, currentHeight + 1, 'rgba(0, 255, 150, 0.7)');
    currentHeight += 1;

    // Герметизация швов
    if (this.services.sealing) {
      this.drawBox(half, currentHeight, currentHeight + 0.3, 'rgba(100, 200, 255, 0.6)');
      currentHeight += 0.3;
    }

    // Бордюр
    if (this.services.edge) {
      this.drawBorder(half, currentHeight);
    }
  }

  drawBox(half, startHeight, endHeight, color) {
    const corners = [
      { x: -half, y: startHeight, z: -half },
      { x: half, y: startHeight, z: -half },
      { x: half, y: startHeight, z: half },
      { x: -half, y: startHeight, z: half },
      { x: -half, y: endHeight, z: -half },
      { x: half, y: endHeight, z: -half },
      { x: half, y: endHeight, z: half },
      { x: -half, y: endHeight, z: half }
    ];

    const projected = corners.map(c => ({
      ...this.project(this.rotatePoint(c.x, c.y, c.z)),
      z: this.rotatePoint(c.x, c.y, c.z).z
    }));

    // Sort by Z for painter's algorithm
    const faces = [
      [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6],
      [3, 0, 4, 7], [0, 1, 2, 3], [4, 5, 6, 7]
    ];

    faces.forEach(face => {
      const avgZ = face.reduce((sum, i) => sum + projected[i].z, 0) / face.length;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
      for (let i = 1; i < face.length; i++) {
        this.ctx.lineTo(projected[face[i]].x, projected[face[i]].y);
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 255, 150, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  drawCrackedSurface(half, height) {
    this.ctx.strokeStyle = 'rgba(100, 50, 20, 0.6)';
    this.ctx.lineWidth = 1;

    for (let i = 0; i < 8; i++) {
      const x1 = -half + Math.random() * (half * 2);
      const z1 = -half + Math.random() * (half * 2);
      const x2 = x1 + (Math.random() - 0.5) * 4;
      const z2 = z1 + (Math.random() - 0.5) * 4;

      const p1 = this.project(this.rotatePoint(x1, height, z1));
      const p2 = this.project(this.rotatePoint(x2, height, z2));

      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
  }

  drawBorder(half, height) {
    const borderWidth = 0.3;
    const perimeter = 4 * Math.sqrt(this.area);
    const segmentLength = (2 * half) / (perimeter / (2 * half));

    const positions = [
      { start: { x: -half, z: -half }, end: { x: half, z: -half } },
      { start: { x: half, z: -half }, end: { x: half, z: half } },
      { start: { x: half, z: half }, end: { x: -half, z: half } },
      { start: { x: -half, z: half }, end: { x: -half, z: -half } }
    ];

    positions.forEach(pos => {
      const corners = [
        { x: pos.start.x, y: height, z: pos.start.z },
        { x: pos.end.x, y: height, z: pos.end.z },
        { x: pos.end.x, y: height + borderWidth, z: pos.end.z },
        { x: pos.start.x, y: height + borderWidth, z: pos.start.z }
      ];

      const projected = corners.map(c => this.project(this.rotatePoint(c.x, c.y, c.z)));

      this.ctx.fillStyle = 'rgba(200, 50, 255, 0.7)';
      this.ctx.beginPath();
      this.ctx.moveTo(projected[0].x, projected[0].y);
      this.ctx.lineTo(projected[1].x, projected[1].y);
      this.ctx.lineTo(projected[2].x, projected[2].y);
      this.ctx.lineTo(projected[3].x, projected[3].y);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(200, 50, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
  }

  drawLabels() {
    this.ctx.fillStyle = 'rgba(0, 255, 150, 0.8)';
    this.ctx.font = 'bold 12px Manrope, monospace';
    this.ctx.textAlign = 'center';

    const labels = [];
    if (this.services.removal) labels.push('Демонтаж');
    if (this.services.prep) labels.push('Подготовка');
    labels.push('Покрытие');
    if (this.services.sealing) labels.push('Герметизация');
    if (this.services.edge) labels.push('Бордюр');

    labels.forEach((label, i) => {
      this.ctx.fillText(label, this.width - 100, 30 + i * 20);
    });
  }

  animate() {
    this.ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawGuidGrid();
    this.drawBase();
    this.drawLayers();
    this.drawLabels();

    requestAnimationFrame(() => this.animate());
  }

  resize() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
}

// Export for use in main script
window.TronVisualization = TronVisualization;
