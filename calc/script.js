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
    this.discountRow = document.getElementById('discountRow');
    this.discountAmount = document.getElementById('discountAmount');
    this.servicesBreakdown = document.getElementById('servicesBreakdown');
    this.contactBtn = document.getElementById('contactBtn');
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

    const baseCost = this.calculateBaseCost(area);
    const { cost: servicesCost, items: servicesItems } = this.calculateServices(area);
    const subtotal = baseCost + servicesCost;
    const { discount: discountValue, final: finalTotal } = this.applyDiscount(subtotal);

    this.renderResults(baseCost, servicesItems, discountValue, finalTotal);
  }

  calculateBaseCost(area) {
    const coverageRadio = document.querySelector('input[name="coverage"]:checked');
    const basePrice = parseFloat(coverageRadio.dataset.price) || 0;
    return area * basePrice;
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
