(function () {
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var isOpen = nav.classList.contains('nav--open');
      nav.classList.toggle('nav--open', !isOpen);
      burger.setAttribute('aria-expanded', !isOpen);
    });
    document.querySelectorAll('.nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initCases() {
    var tabsEl = document.querySelector('.cases-tabs');
    var cardEl = document.querySelector('.case-card');
    if (!tabsEl || !cardEl) return;

    fetch('cases/cases.json')
      .then(function (r) { return r.json(); })
      .then(function (cases) {
        if (!cases.length) return;

        var currentIndex = 0;
        var currentSlide = 0;

        cases.forEach(function (c, i) {
          var tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'cases-tabs__tab';
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', i === 0);
          tab.setAttribute('aria-controls', 'case-panel');
          tab.id = 'case-tab-' + i;
          tab.textContent = c.title;
          tab.dataset.index = String(i);
          tabsEl.appendChild(tab);
        });

        var listEl = cardEl.querySelector('.case-carousel__list');
        var btnPrev = cardEl.querySelector('.case-carousel__btn--prev');
        var btnNext = cardEl.querySelector('.case-carousel__btn--next');
        var titleEl = cardEl.querySelector('.case-card__title');
        var metaArea = cardEl.querySelector('.case-card__meta--area .case-card__meta-value');
        var metaMaterial = cardEl.querySelector('.case-card__meta--material .case-card__meta-value');
        var metaLocation = cardEl.querySelector('.case-card__meta--location .case-card__meta-value');
        var metaDuration = cardEl.querySelector('.case-card__meta--duration .case-card__meta-value');
        var metaCost = cardEl.querySelector('.case-card__meta--cost .case-card__meta-value');

        function renderCase(index) {
          var c = cases[index];
          if (!c) return;
          currentIndex = index;

          titleEl.textContent = c.title + (c.location && c.location !== 'Укажите локацию' ? ' в ' + c.location : '');
          if (metaArea) metaArea.textContent = c.area;
          if (metaMaterial) metaMaterial.textContent = c.material;
          if (metaLocation) metaLocation.textContent = c.location;
          if (metaDuration) metaDuration.textContent = c.duration;
          if (metaCost) metaCost.textContent = c.cost;

          listEl.innerHTML = '';
          var base = 'cases/' + c.id + '/';
          c.photos.forEach(function (photo) {
            var slide = document.createElement('div');
            slide.className = 'case-carousel__slide';
            var img = document.createElement('img');
            img.src = base + photo;
            img.alt = c.title + ' — фото';
            slide.appendChild(img);
            listEl.appendChild(slide);
          });

          currentSlide = 0;
          updateCarousel();
          updateCarouselButtons();
          tabsEl.querySelectorAll('.cases-tabs__tab').forEach(function (t, i) {
            t.setAttribute('aria-selected', i === index);
          });
        }

        function updateCarousel() {
          listEl.style.transform = 'translateX(-' + currentSlide * 100 + '%)';
        }

        function updateCarouselButtons() {
          var total = (cases[currentIndex] && cases[currentIndex].photos.length) || 0;
          if (btnPrev) btnPrev.hidden = total <= 1;
          if (btnNext) btnNext.hidden = total <= 1;
        }

        tabsEl.addEventListener('click', function (e) {
          var tab = e.target.closest('.cases-tabs__tab');
          if (!tab || tab.getAttribute('role') !== 'tab') return;
          var i = parseInt(tab.dataset.index, 10);
          if (!isNaN(i)) {
            renderCase(i);
          }
        });

        if (btnPrev) {
          btnPrev.addEventListener('click', function () {
            var total = cases[currentIndex].photos.length;
            if (total <= 1) return;
            currentSlide = currentSlide <= 0 ? total - 1 : currentSlide - 1;
            updateCarousel();
          });
        }
        if (btnNext) {
          btnNext.addEventListener('click', function () {
            var total = cases[currentIndex].photos.length;
            if (total <= 1) return;
            currentSlide = currentSlide >= total - 1 ? 0 : currentSlide + 1;
            updateCarousel();
          });
        }

        cardEl.hidden = false;
        renderCase(0);
      })
      .catch(function () {
        cardEl.hidden = true;
      });
  }

  initCases();
})();
