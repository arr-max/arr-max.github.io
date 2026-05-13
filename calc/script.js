class Calculator {
  constructor() {
    this.setupDOM();
    this.setupVisualization();
    this.attachEventListeners();
    this.initialize();
  }

  setupDOM() {
    // Inputs
    this.areaInput = document.getElementById('area');
    this.areaSlider = document.getElementById('areaSlider');
    this.perimeterInput = document.getElementById('perimeter');
    this.discountInput = document.getElementById('discount');

    // Checkboxes
    this.edgeCheckbox = document.querySelector('input[value="edge"]');
    this.prepCheckbox = document.querySelector('input[value="prep"]');
    this.sealingCheckbox = document.querySelector('input[value="sealing"]');
    this.removalCheckbox = document.querySelector('input[value="removal"]');
    this.edgeGroup = document.getElementById('edgeGroup');

    // Outputs
    this.baseCostDisplay = document.getElementById('baseCost');
    this.totalCostDisplay = document.getElementById('totalCost');
    this.quickPriceDisplay = document.getElementById('quickPrice');
    this.stickyPriceDisplay = document.getElementById('stickyPrice');
    this.discountRow = document.getElementById('discountRow');
    this.discountAmount = document.getElementById('discountAmount');
    this.servicesBreakdown = document.getElementById('servicesBreakdown');
    this.contactBtn = document.getElementById('contactBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.stickyBar = document.getElementById('stickyBar');
    this.stickyContactBtn = document.getElementById('stickyContactBtn');
    this.stickyDownloadBtn = document.getElementById('stickyDownloadBtn');
    this.stickyExpandBtn = document.getElementById('stickyExpandBtn');
    this.stickySheet = document.getElementById('stickySheet');
    this.sheetDownloadCalc = document.getElementById('sheetDownloadCalc');

    // State for download
    this.lastSnapshot = null;
  }

  setupVisualization() {
    const canvas3d = document.getElementById('canvas3d');
    this.viz = new TronVisualization(canvas3d);
    window.addEventListener('resize', () => this.viz.resize());
  }

  attachEventListeners() {
    // Area sync
    this.areaInput.addEventListener('input', () => this.syncArea());
    this.areaSlider.addEventListener('input', () => this.syncArea(true));

    // Services
    this.edgeCheckbox.addEventListener('change', () => this.handleEdgeChange());
    document.querySelectorAll('input[name="coverage"]').forEach(radio => {
      radio.addEventListener('change', () => this.calculate());
    });
    document.querySelectorAll('input[name="service"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.calculate());
    });

    // Other
    this.perimeterInput.addEventListener('input', () => this.calculate());
    this.discountInput.addEventListener('input', () => this.calculate());
    this.contactBtn.addEventListener('click', () => this.sendToTelegram());
    this.downloadBtn.addEventListener('click', () => this.downloadCalculation());
    this.stickyContactBtn.addEventListener('click', () => this.sendToTelegram());
    this.stickyDownloadBtn.addEventListener('click', () => this.downloadCalculation());

    // Sticky sheet (popup with download options)
    this.stickyExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSheet();
    });
    this.sheetDownloadCalc.addEventListener('click', () => {
      this.closeSheet();
      this.downloadCalculation();
    });
    document.addEventListener('click', (e) => {
      if (!this.stickyBar.contains(e.target)) this.closeSheet();
    });

    // Sticky bar visibility on scroll
    window.addEventListener('scroll', () => this.updateStickyVisibility(), { passive: true });
  }

  toggleSheet() {
    const isOpen = !this.stickySheet.hasAttribute('hidden');
    if (isOpen) this.closeSheet();
    else this.openSheet();
  }

  openSheet() {
    this.stickySheet.removeAttribute('hidden');
    this.stickyExpandBtn.setAttribute('aria-expanded', 'true');
  }

  closeSheet() {
    this.stickySheet.setAttribute('hidden', '');
    this.stickyExpandBtn.setAttribute('aria-expanded', 'false');
  }

  updateStickyVisibility() {
    const scrolled = window.scrollY > 200;
    this.stickyBar.classList.toggle('is-visible', scrolled);
  }

  syncArea(fromSlider = false) {
    const value = parseFloat(fromSlider ? this.areaSlider.value : this.areaInput.value) || 0;
    if (!fromSlider) this.areaSlider.value = value;
    else this.areaInput.value = value;

    this.updatePerimeterForSquare(value);
    this.calculate();
  }

  handleEdgeChange() {
    this.edgeGroup.style.display = this.edgeCheckbox.checked ? 'flex' : 'none';
    if (!this.edgeCheckbox.checked) this.perimeterInput.value = '';
    this.calculate();
  }

  updatePerimeterForSquare(area) {
    if (this.edgeCheckbox.checked && area > 0) {
      const perimeter = 4 * Math.sqrt(area);
      this.perimeterInput.value = perimeter.toFixed(1);
    }
  }

  updateVisualization() {
    const area = parseFloat(this.areaInput.value) || 0;
    this.viz.updateServices({
      prep: this.prepCheckbox.checked,
      edge: this.edgeCheckbox.checked,
      sealing: this.sealingCheckbox.checked,
      removal: this.removalCheckbox.checked
    }, area);
  }

  calculate() {
    const area = parseFloat(this.areaInput.value) || 0;
    if (area <= 0) return;

    this.updateVisualization();

    const coverageRadio = document.querySelector('input[name="coverage"]:checked');
    const coverageName = coverageRadio.parentElement.querySelector('.radio-label strong').textContent;
    const coveragePrice = parseFloat(coverageRadio.dataset.price) || 0;

    const baseCost = area * coveragePrice;
    const { cost: servicesCost, items: servicesItems } = this.calculateServices(area);
    const subtotal = baseCost + servicesCost;
    const { discount: discountValue, final: finalTotal } = this.applyDiscount(subtotal);

    this.lastSnapshot = {
      area, coverageName, coveragePrice,
      baseCost, servicesItems, subtotal,
      discountPercent: parseFloat(this.discountInput.value) || 0,
      discountValue, finalTotal,
      perimeter: parseFloat(this.perimeterInput.value) || 0
    };

    this.renderResults(baseCost, servicesItems, discountValue, finalTotal);
  }

  calculateServices(area) {
    let cost = 0;
    const items = [];

    document.querySelectorAll('input[name="service"]:checked').forEach(checkbox => {
      const price = parseFloat(checkbox.dataset.price) || 0;
      const name = checkbox.parentElement.querySelector('.checkbox-label strong').textContent;

      if (checkbox.value === 'edge') {
        const perimeter = parseFloat(this.perimeterInput.value) || 0;
        const itemCost = perimeter * price;
        if (perimeter > 0) {
          items.push({ name: `${name} (${perimeter} п.м)`, cost: itemCost });
          cost += itemCost;
        }
      } else {
        const itemCost = area * price;
        items.push({ name, cost: itemCost });
        cost += itemCost;
      }
    });

    return { cost, items };
  }

  applyDiscount(subtotal) {
    const percent = parseFloat(this.discountInput.value) || 0;
    const discount = (subtotal * percent) / 100;
    return { discount, final: subtotal - discount };
  }

  renderResults(baseCost, servicesItems, discountValue, finalTotal) {
    const formatPrice = (price) => new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);

    this.baseCostDisplay.textContent = formatPrice(baseCost);
    this.totalCostDisplay.textContent = formatPrice(finalTotal);
    this.quickPriceDisplay.textContent = formatPrice(finalTotal);
    if (this.stickyPriceDisplay) this.stickyPriceDisplay.textContent = formatPrice(finalTotal);

    // Services breakdown
    this.servicesBreakdown.innerHTML = servicesItems.length
      ? servicesItems.map(item => `
          <div class="service-item">
            <span>${item.name}</span>
            <span class="service-item-price">${formatPrice(item.cost)}</span>
          </div>
        `).join('')
      : '';

    // Discount row
    if (this.discountInput.value > 0) {
      this.discountRow.style.display = 'flex';
      this.discountAmount.textContent = `-${formatPrice(discountValue)}`;
    } else {
      this.discountRow.style.display = 'none';
    }
  }

  downloadCalculation() {
    const s = this.lastSnapshot;
    if (!s) return;

    const fmt = (v) => new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: 'RUB', minimumFractionDigits: 0
    }).format(v);
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const itemsHtml = s.servicesItems.map(item => `
      <tr>
        <td>${item.name}</td>
        <td class="num">${fmt(item.cost)}</td>
      </tr>
    `).join('');

    const discountHtml = s.discountPercent > 0 ? `
      <tr class="discount">
        <td>Скидка ${s.discountPercent}%</td>
        <td class="num">−${fmt(s.discountValue)}</td>
      </tr>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Расчёт каменного ковра TerraWay — ${date}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    color: #2c2825; margin: 0; padding: 24px;
    background: #fff; line-height: 1.5;
  }
  .doc { max-width: 720px; margin: 0 auto; }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #8b6914; padding-bottom: 18px; margin-bottom: 24px;
  }
  .brand h1 {
    font-family: 'Playfair Display', Georgia, serif;
    margin: 0 0 4px 0; font-size: 24px; color: #2c2825;
  }
  .brand p { margin: 0; color: #6b6560; font-size: 13px; }
  .meta { text-align: right; font-size: 12px; color: #6b6560; }
  .meta strong { color: #2c2825; }

  h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18px; margin: 28px 0 12px 0; color: #2c2825;
  }

  .params {
    background: #f5f2ee; border-radius: 8px; padding: 16px 20px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
    font-size: 14px;
  }
  .params .row { display: flex; justify-content: space-between; }
  .params .label { color: #6b6560; }
  .params .value { font-weight: 600; }

  table {
    width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;
  }
  th, td {
    text-align: left; padding: 10px 8px; border-bottom: 1px solid #e8e4de;
  }
  th { color: #6b6560; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.discount td { color: #4a7c59; }
  tr.subtotal td { font-weight: 600; padding-top: 14px; }
  tr.total td {
    font-size: 18px; font-weight: 700; color: #8b6914;
    padding-top: 14px; border-top: 2px solid #2c2825; border-bottom: none;
  }

  .note {
    background: #fafaf8; border-left: 3px solid #8b6914; padding: 12px 16px;
    margin: 24px 0; font-size: 13px; color: #6b6560;
  }

  .contact {
    margin-top: 28px; padding-top: 20px; border-top: 1px solid #d4cfc8;
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  .contact-block h3 {
    font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #6b6560; margin: 0 0 8px 0; font-weight: 600;
  }
  .contact-block p { margin: 4px 0; font-size: 14px; }
  .contact-block a { color: #8b6914; text-decoration: none; font-weight: 600; }

  .footer {
    margin-top: 24px; padding-top: 16px; border-top: 1px solid #e8e4de;
    text-align: center; font-size: 11px; color: #9a948e;
  }

  .actions { text-align: center; margin: 20px 0; }
  .actions button {
    background: #8b6914; color: #fff; border: none; padding: 12px 28px;
    border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: inherit; margin: 0 6px;
  }
  .actions .secondary { background: #fff; color: #8b6914; border: 1px solid #8b6914; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="doc">
  <div class="header">
    <div class="brand">
      <h1>Команда Арр Макс</h1>
      <p>Каменные ковры TerraWay® · строительные работы</p>
    </div>
    <div class="meta">
      <div>Расчёт от <strong>${date}</strong></div>
      <div>arr-max.github.io/calc</div>
    </div>
  </div>

  <h2>Параметры проекта</h2>
  <div class="params">
    <div class="row"><span class="label">Площадь</span><span class="value">${s.area} м²</span></div>
    <div class="row"><span class="label">Тип покрытия</span><span class="value">${s.coverageName}</span></div>
    ${s.perimeter > 0 ? `<div class="row"><span class="label">Периметр</span><span class="value">${s.perimeter} п.м</span></div>` : ''}
    <div class="row"><span class="label">Цена за м²</span><span class="value">${fmt(s.coveragePrice)}</span></div>
  </div>

  <h2>Стоимость работ</h2>
  <table>
    <thead>
      <tr><th>Позиция</th><th class="num">Стоимость</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Материал и укладка · ${s.coverageName} · ${s.area} м²</td>
        <td class="num">${fmt(s.baseCost)}</td>
      </tr>
      ${itemsHtml}
      <tr class="subtotal">
        <td>Итого без скидки</td>
        <td class="num">${fmt(s.subtotal)}</td>
      </tr>
      ${discountHtml}
      <tr class="total">
        <td>К оплате</td>
        <td class="num">${fmt(s.finalTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="note">
    Это предварительный расчёт. Точная стоимость зависит от особенностей объекта,
    доступности территории и сроков работ. Готовы выехать на замер бесплатно.
  </div>

  <div class="contact">
    <div class="contact-block">
      <h3>Связаться</h3>
      <p>Максим</p>
      <p><a href="tel:+79887680835">+7 988 768 08 35</a></p>
      <p><a href="https://t.me/arrmax_pub">Telegram: @arrmax_pub</a></p>
    </div>
    <div class="contact-block">
      <h3>О технологии</h3>
      <p>Водопроницаемость: 1800 л/м²·ч</p>
      <p>Противоскольжение: класс R11</p>
      <p>Материал: terraway.eu</p>
    </div>
  </div>

  <div class="footer">
    © Команда Арр Макс. TerraWay® — зарегистрированная торговая марка.
  </div>

  <div class="actions">
    <button onclick="window.print()">📄 Скачать PDF / Распечатать</button>
    <button class="secondary" onclick="window.close()">Закрыть</button>
  </div>
</div>
<script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Разрешите всплывающие окна, чтобы скачать расчёт.');
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  sendToTelegram() {
    const area = parseFloat(this.areaInput.value) || 0;
    const coverage = document.querySelector('input[name="coverage"]:checked');
    const services = Array.from(document.querySelectorAll('input[name="service"]:checked'))
      .map(cb => cb.parentElement.querySelector('.checkbox-label strong').textContent)
      .join(', ');

    const text = `Калькулятор: ${area}м² ${coverage.parentElement.querySelector('.radio-label strong').textContent} ${services ? `| ${services}` : ''}`;
    window.location.href = `https://t.me/arrmax_pub?text=${encodeURIComponent(text)}`;
  }

  initialize() {
    this.updatePerimeterForSquare(parseFloat(this.areaInput.value));
    this.updateVisualization();
    this.calculate();
  }
}

document.addEventListener('DOMContentLoaded', () => new Calculator());
