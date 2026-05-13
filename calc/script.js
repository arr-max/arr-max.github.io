// Бургер-меню
document.addEventListener('DOMContentLoaded', function() {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function() {
      const isOpen = nav.classList.contains('nav--open');
      nav.classList.toggle('nav--open', !isOpen);
      burger.setAttribute('aria-expanded', !isOpen);
    });
    document.querySelectorAll('.nav a').forEach(function(link) {
      link.addEventListener('click', function() {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const areaInput = document.getElementById('area');
  const areaSlider = document.getElementById('areaSlider');
  const perimeterInput = document.getElementById('perimeter');
  const discountInput = document.getElementById('discount');
  const edgeCheckbox = document.querySelector('input[value="edge"]');
  const edgeGroup = document.getElementById('edgeGroup');

  const baseCostDisplay = document.getElementById('baseCost');
  const totalCostDisplay = document.getElementById('totalCost');
  const quickPriceDisplay = document.getElementById('quickPrice');
  const discountRow = document.getElementById('discountRow');
  const discountAmount = document.getElementById('discountAmount');
  const servicesBreakdown = document.getElementById('servicesBreakdown');
  const contactBtn = document.getElementById('contactBtn');

  // Синхронизация площади между инпутом и слайдером
  areaInput.addEventListener('input', function() {
    const value = parseFloat(this.value) || 0;
    areaSlider.value = value;
    updatePerimeterForSquare(value);
    calculateTotal();
  });

  areaSlider.addEventListener('input', function() {
    areaInput.value = this.value;
    updatePerimeterForSquare(parseFloat(this.value));
    calculateTotal();
  });

  // Показать/скрыть поле периметра для бордюра
  edgeCheckbox.addEventListener('change', function() {
    edgeGroup.style.display = this.checked ? 'flex' : 'none';
    if (!this.checked) {
      perimeterInput.value = '';
    }
    calculateTotal();
  });

  // Слушатели на все элементы формы
  document.querySelectorAll('input[name="coverage"]').forEach(radio => {
    radio.addEventListener('change', calculateTotal);
  });

  document.querySelectorAll('input[name="service"]').forEach(checkbox => {
    checkbox.addEventListener('change', calculateTotal);
  });

  perimeterInput.addEventListener('input', calculateTotal);
  discountInput.addEventListener('input', calculateTotal);

  // Кнопка контакта
  contactBtn.addEventListener('click', function() {
    const area = parseFloat(areaInput.value) || 0;
    const coverage = document.querySelector('input[name="coverage"]:checked');
    const selectedServices = Array.from(document.querySelectorAll('input[name="service"]:checked'))
      .map(cb => cb.parentElement.querySelector('.checkbox-label strong').textContent)
      .join(', ');

    const message = `Я интересуюсь калькулятором каменных ковров. Площадь: ${area} м². Тип покрытия: ${coverage.parentElement.querySelector('.radio-label strong').textContent}. Услуги: ${selectedServices || 'стандартный пакет'}`;
    window.location.href = `https://t.me/arrmax_pub?text=${encodeURIComponent(message)}`;
  });

  function calculateTotal() {
    const area = parseFloat(areaInput.value) || 0;
    if (area <= 0) return;

    // Базовая стоимость (материал + укладка)
    const coverageRadio = document.querySelector('input[name="coverage"]:checked');
    const basePrice = parseFloat(coverageRadio.dataset.price) || 0;
    let baseCost = area * basePrice;

    // Дополнительные услуги
    let servicesCost = 0;
    const servicesItems = [];
    const checkedServices = document.querySelectorAll('input[name="service"]:checked');

    checkedServices.forEach(checkbox => {
      const servicePrice = parseFloat(checkbox.dataset.price) || 0;
      const serviceName = checkbox.parentElement.querySelector('.checkbox-label strong').textContent;
      let cost = 0;

      if (checkbox.value === 'edge') {
        // Бордюр считается по периметру
        const perimeter = parseFloat(perimeterInput.value) || 0;
        cost = perimeter * servicePrice;
        if (perimeter > 0) {
          servicesItems.push({
            name: `${serviceName} (${perimeter} п.м)`,
            cost: cost
          });
        }
      } else {
        // Остальные услуги считаются по площади
        cost = area * servicePrice;
        servicesItems.push({
          name: serviceName,
          cost: cost
        });
      }
      servicesCost += cost;
    });

    // Обновление детализации услуг
    if (servicesItems.length > 0) {
      servicesBreakdown.innerHTML = servicesItems
        .map(item => `
          <div class="service-item">
            <span>${item.name}</span>
            <span class="service-item-price">${formatPrice(item.cost)}</span>
          </div>
        `)
        .join('');
    } else {
      servicesBreakdown.innerHTML = '';
    }

    // Итого до скидки
    const subtotal = baseCost + servicesCost;

    // Скидка
    const discountPercent = parseFloat(discountInput.value) || 0;
    const discountValue = (subtotal * discountPercent) / 100;
    const finalTotal = subtotal - discountValue;

    // Обновление отображения
    baseCostDisplay.textContent = formatPrice(baseCost);
    totalCostDisplay.textContent = formatPrice(finalTotal);
    quickPriceDisplay.textContent = formatPrice(finalTotal);

    if (discountPercent > 0) {
      discountRow.style.display = 'flex';
      discountAmount.textContent = `-${formatPrice(discountValue)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  // Функция для расчета периметра квадрата (4 * √площадь)
  function updatePerimeterForSquare(area) {
    if (edgeCheckbox.checked && area > 0) {
      const sideLength = Math.sqrt(area);
      const perimeter = 4 * sideLength;
      perimeterInput.value = perimeter.toFixed(1);
    }
  }

  // Первый расчет и установка периметра
  updatePerimeterForSquare(parseFloat(areaInput.value));
  calculateTotal();
});
