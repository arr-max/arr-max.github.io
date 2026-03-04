(function () {
  var LANG_KEY = 'arrmax_lang';
  var DEFAULT_LANG = 'ru';

  function getLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      return (saved === 'ru' || saved === 'en') ? saved : DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function setLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}
  }

  function getT(lang) {
    var i18n = typeof window.ARRMAX_I18N !== 'undefined' ? window.ARRMAX_I18N : {};
    return i18n[lang] || i18n[DEFAULT_LANG] || {};
  }

  function applyI18n(lang) {
    var t = getT(lang);
    document.documentElement.lang = lang;
    document.title = lang === 'ru'
      ? 'Строительные работы — Каменные ковры TerraWay'
      : 'Construction — TerraWay Stone Carpets';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] != null) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (t[key] != null) el.setAttribute('aria-label', t[key]);
    });

    if (typeof window.ARRMAX_REFRESH_CASE === 'function') {
      window.ARRMAX_REFRESH_CASE();
    }
    if (typeof window.ARRMAX_TYPEWRITER_RESTART === 'function') {
      window.ARRMAX_TYPEWRITER_RESTART();
    }
  }

  function getPhotoLabel(filename, lang) {
    var name = (filename || '').toLowerCase();
    var t = getT(lang);
    if (name.indexOf('after') === 0) return t.photoResult || '';
    if (name.indexOf('during') === 0) return t.photoProcess || '';
    if (name.indexOf('before') === 0) return t.photoBefore || '';
    return '';
  }

  function translateCaseValue(value, key, lang) {
    var t = getT(lang);
    if (value === 'Укажите локацию' || value === 'Specify location') return t.placeholderLocation;
    if (value === '— кв. м' || value === '— m²') return t.placeholderArea;
    if (value && value.indexOf('TerraWay') !== -1 && value.indexOf('укажите') !== -1) return t.placeholderMaterial;
    if (value === '—' && key === 'duration') return t.placeholderDuration;
    if (value === '— Р' || value === '—') return t.placeholderCost;
    return value;
  }

  function initLangSwitch() {
    var wrap = document.querySelector('.lang-switch');
    if (!wrap) return;

    var updateActive = function () {
      var lang = getLang();
      wrap.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
      });
    };

    wrap.addEventListener('click', function (e) {
      var btn = e.target;
      while (btn && btn !== wrap) {
        if (btn.classList && btn.classList.contains('lang-switch__btn')) break;
        btn = btn.parentElement;
      }
      if (!btn || btn === wrap) return;
      var lang = btn.getAttribute('data-lang');
      if (!lang) return;
      e.preventDefault();
      setLang(lang);
      applyI18n(lang);
      updateActive();
    });

    updateActive();
  }

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
  })();

  function initCases() {
    var tabsEl = document.querySelector('.cases-tabs');
    var cardEl = document.querySelector('.case-card');
    if (!tabsEl || !cardEl) return;

    var currentIndex = 0;
    var currentSlide = 0;
    var cases = [];

    function getLangForCase() {
      return getLang();
    }

    function getCaseTitle(c, lang) {
      return (lang === 'en' && c.titleEn) ? c.titleEn : c.title;
    }

    function updateCaseTabsLang() {
      var lang = getLangForCase();
      tabsEl.querySelectorAll('.cases-tabs__tab').forEach(function (tab, i) {
        var c = cases[i];
        if (c) tab.textContent = getCaseTitle(c, lang);
      });
    }

    function renderCase(index) {
      var c = cases[index];
      if (!c) return;
      currentIndex = index;
      var lang = getLangForCase();
      var t = getT(lang);

      var titleEl = cardEl.querySelector('.case-card__title');
      var metaArea = cardEl.querySelector('.case-card__meta--area .case-card__meta-value');
      var metaMaterial = cardEl.querySelector('.case-card__meta--material .case-card__meta-value');
      var metaLocation = cardEl.querySelector('.case-card__meta--location .case-card__meta-value');
      var metaDuration = cardEl.querySelector('.case-card__meta--duration .case-card__meta-value');
      var metaCost = cardEl.querySelector('.case-card__meta--cost .case-card__meta-value');

      if (titleEl) {
        var locationPart = (c.location && c.location !== 'Укажите локацию' && c.location !== 'Specify location')
          ? t.inLocation + c.location
          : '';
        titleEl.textContent = getCaseTitle(c, lang) + locationPart;
      }

      if (metaArea) metaArea.textContent = translateCaseValue(c.area, 'area', lang);
      if (metaMaterial) metaMaterial.textContent = translateCaseValue(c.material, 'material', lang);
      if (metaLocation) metaLocation.textContent = translateCaseValue(c.location, 'location', lang);
      if (metaDuration) metaDuration.textContent = translateCaseValue(c.duration, 'duration', lang);
      if (metaCost) metaCost.textContent = translateCaseValue(c.cost, 'cost', lang);

      var listEl = cardEl.querySelector('.case-carousel__list');
      if (!listEl) return;
      var photos = Array.isArray(c.photos) ? c.photos : [];
      var photoList = photos.length ? photos : ['photo.jpg'];
      var numPhotos = photoList.length;
      var base = 'cases/' + (c.id || 'case_1') + '/';
      listEl.innerHTML = '';
      listEl.style.width = (numPhotos * 100) + '%';

      photoList.forEach(function (photo) {
        var slide = document.createElement('div');
        slide.className = 'case-carousel__slide';
        slide.style.flexBasis = (100 / numPhotos) + '%';
        var img = document.createElement('img');
        img.src = base + photo;
        img.alt = c.title + ' — ';
        var label = getPhotoLabel(photo, lang);
        slide.appendChild(img);
        if (label) {
          var caption = document.createElement('div');
          caption.className = 'case-carousel__caption';
          caption.textContent = label;
          slide.appendChild(caption);
        }
        listEl.appendChild(slide);
      });

      currentSlide = 0;
      updateCarousel();
      updateCarouselButtons();
      tabsEl.querySelectorAll('.cases-tabs__tab').forEach(function (tab, i) {
        tab.setAttribute('aria-selected', i === index);
      });
    }

    function updateCarousel() {
      var listEl = cardEl.querySelector('.case-carousel__list');
      if (!listEl) return;
      var total = cases[currentIndex] && cases[currentIndex].photos.length;
      var pct = total > 0 ? (currentSlide / total) * 100 : 0;
      listEl.style.transform = 'translateX(-' + pct + '%)';
    }

    function updateCarouselButtons() {
      var btnPrev = cardEl.querySelector('.case-carousel__btn--prev');
      var btnNext = cardEl.querySelector('.case-carousel__btn--next');
      var total = (cases[currentIndex] && cases[currentIndex].photos.length) || 0;
      if (btnPrev) btnPrev.hidden = total <= 1;
      if (btnNext) btnNext.hidden = total <= 1;
    }

    window.ARRMAX_REFRESH_CASE = function () {
      if (cases.length) {
        updateCaseTabsLang();
        renderCase(currentIndex);
      }
    };

    var casesUrl = new URL('cases/cases.json', window.location.href).href;
    fetch(casesUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('Fetch failed');
        return r.json();
      })
      .then(function (data) {
        cases = Array.isArray(data) ? data : [];
        cardEl.classList.remove('case-card--loading');
        cardEl.removeAttribute('data-load-error');
        if (!cases.length) {
          cardEl.setAttribute('data-load-error', '1');
          var errEl = cardEl.querySelector('.case-card__load-err');
          if (errEl) errEl.textContent = getT(getLangForCase()).casesLoadError || 'Нет объектов';
          return;
        }

        tabsEl.innerHTML = '';
        cases.forEach(function (c, i) {
          var tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'cases-tabs__tab';
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', i === 0);
          tab.setAttribute('aria-controls', 'case-panel');
          tab.id = 'case-tab-' + i;
          tab.textContent = getCaseTitle(c, getLangForCase());
          tab.dataset.index = String(i);
          tabsEl.appendChild(tab);
        });

        var listEl = cardEl.querySelector('.case-carousel__list');
        var btnPrev = cardEl.querySelector('.case-carousel__btn--prev');
        var btnNext = cardEl.querySelector('.case-carousel__btn--next');

        tabsEl.addEventListener('click', function (e) {
          var tab = e.target.closest('.cases-tabs__tab');
          if (!tab || tab.getAttribute('role') !== 'tab') return;
          var i = parseInt(tab.dataset.index, 10);
          if (!isNaN(i)) renderCase(i);
        });

        if (btnPrev) {
          btnPrev.addEventListener('click', function () {
            var total = cases[currentIndex] && cases[currentIndex].photos.length;
            if (total <= 1) return;
            currentSlide = currentSlide <= 0 ? total - 1 : currentSlide - 1;
            updateCarousel();
          });
        }
        if (btnNext) {
          btnNext.addEventListener('click', function () {
            var total = cases[currentIndex] && cases[currentIndex].photos.length;
            if (total <= 1) return;
            currentSlide = currentSlide >= total - 1 ? 0 : currentSlide + 1;
            updateCarousel();
          });
        }

        renderCase(0);
      })
      .catch(function () {
        cardEl.classList.add('case-card--loading');
        cardEl.setAttribute('data-load-error', '1');
        var t = getT(getLangForCase());
        var errEl = cardEl.querySelector('.case-card__load-err');
        if (errEl) errEl.textContent = t.casesLoadError || 'Не удалось загрузить объекты';
      });
  }

  (function typewriter() {
    var el = document.querySelector('.header__typewriter-text');
    var cursorEl = document.querySelector('.header__typewriter-cursor');
    if (!el || !cursorEl) return;

    var timeoutId = null;
    var phraseIndex = 0;
    var charIndex = 0;
    var isDeleting = false;
    var TYPING_MS = 90;
    var DELETING_MS = 50;
    var PAUSE_AFTER_PHRASE_MS = 2200;
    var PAUSE_AFTER_DELETE_MS = 400;

    function getPhrases() {
      var t = getT(getLang());
      return [
        t.typewriter1,
        t.typewriter2,
        t.typewriter3,
        t.typewriter4,
        t.typewriter5,
        t.typewriter6,
        t.typewriter7,
        t.typewriter8,
        t.typewriter9,
        t.typewriter10,
        t.typewriter11
      ].filter(Boolean);
    }

    function tick() {
      var phrases = getPhrases();
      if (!phrases.length) return;
      var phrase = phrases[phraseIndex];
      if (isDeleting) {
        charIndex--;
        el.textContent = phrase.slice(0, charIndex);
        timeoutId = setTimeout(tick, charIndex > 0 ? DELETING_MS : PAUSE_AFTER_DELETE_MS);
        if (charIndex <= 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      } else {
        charIndex++;
        el.textContent = phrase.slice(0, charIndex);
        if (charIndex >= phrase.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, PAUSE_AFTER_PHRASE_MS);
        } else {
          timeoutId = setTimeout(tick, TYPING_MS);
        }
      }
    }

    function start() {
      if (timeoutId) clearTimeout(timeoutId);
      var phrases = getPhrases();
      phraseIndex = 0;
      charIndex = 0;
      isDeleting = false;
      el.textContent = '';
      if (phrases.length) timeoutId = setTimeout(tick, TYPING_MS);
    }

    window.ARRMAX_TYPEWRITER_RESTART = start;
    start();
  })();

  (function () {
    var lang = getLang();
    applyI18n(lang);
    initLangSwitch();
    initCases();
  })();
})();
