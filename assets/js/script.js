'use strict';

/* =====================================================================
   ПОВЕЛИТЕЛЬ ОГНЯ — скрипты
     1. Плавная прокрутка по якорям
     2. Квиз «Собери свой праздник» (шаги, ползунок, валидация, отправка)
   ===================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- 1. Плавная прокрутка по якорным ссылкам ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      const targetId = link.getAttribute('href');
      if (targetId === '#' || targetId.length < 2) return;

      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });


  /* ---------- 2. Квиз «Собери свой праздник» ---------- */
  const form = document.getElementById('quizForm');
  if (!form) return;

  const panels = Array.from(form.querySelectorAll('[data-step]'));
  const bars = Array.from(form.querySelectorAll('.quiz__progress-bar'));
  const progress = form.querySelector('[data-progress]');
  const message = form.querySelector('[data-message]');

  const TOTAL_STEPS = 3;   // шагов с индикатором прогресса
  const FORM_STEP = 4;     // экран с контактами
  const SUCCESS_STEP = 5;  // экран благодарности
  let current = 1;

  // Показать нужную панель и обновить прогресс
  function showStep(step) {
    current = step;

    panels.forEach(function (panel) {
      panel.classList.toggle('is-active', Number(panel.dataset.step) === step);
    });

    // Индикатор прогресса виден только на шагах 1–3
    const withProgress = step <= TOTAL_STEPS;
    progress.hidden = !withProgress;
    bars.forEach(function (bar, i) {
      bar.classList.toggle('quiz__progress-bar--active', withProgress && i === step - 1);
    });

    // На шаге с ползунком пересчитываем позицию пузыря (панель стала видимой)
    if (step === 2) updateRange();
  }

  // Проверка, что на шаге-опросе выбран вариант
  function isChoiceMade(step) {
    const panel = panels.find(function (p) { return Number(p.dataset.step) === step; });
    const radios = panel.querySelectorAll('input[type="radio"]');
    if (radios.length === 0) return true;
    return Array.from(radios).some(function (r) { return r.checked; });
  }

  // Навигация «Далее» / «Назад»
  form.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!isChoiceMade(current)) {
        highlight(btn);
        return;
      }
      if (current < FORM_STEP) showStep(current + 1);
    });
  });

  form.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (current > 1) showStep(current - 1);
    });
  });

  // Лёгкая подсветка кнопки, если вариант не выбран
  function highlight(btn) {
    btn.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
       { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
  }


  /* ----- Ползунок бюджета ----- */
  const range = form.querySelector('[data-range]');
  const bubble = form.querySelector('[data-bubble]');

  function updateRange() {
    if (!range || !bubble) return;
    const min = Number(range.min);
    const max = Number(range.max);
    const val = Number(range.value);
    const pct = (val - min) / (max - min);

    bubble.textContent = val.toLocaleString('ru-RU');

    // Позиционируем пузырь над бегунком, не давая ему выйти за края дорожки
    const trackW = range.getBoundingClientRect().width;
    if (trackW > 0) {
      const half = bubble.getBoundingClientRect().width / 2 || 40;
      const x = Math.max(half, Math.min(trackW - half, pct * trackW));
      bubble.style.left = x + 'px';
    } else {
      // Панель ещё скрыта (нет ширины) — используем проценты
      bubble.style.left = 'calc(' + (pct * 100) + '% + ' + ((0.5 - pct) * 26) + 'px)';
    }

    // Заполненная (слева) и пустая (справа) части дорожки
    const p = (pct * 100).toFixed(2) + '%';
    range.style.background =
      'linear-gradient(to right, #EE9C74 0%, #EE9C74 ' + p + ', #FBDDCB ' + p + ', #FBDDCB 100%)';
  }

  if (range && bubble) {
    range.addEventListener('input', updateRange);
    window.addEventListener('resize', function () {
      if (current === 2) updateRange();
    });
    updateRange();
  }


  /* ----- Маска и валидация телефона ----- */
  const phoneInput = form.querySelector('input[name="phone"]');

  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    if (!d) return '';

    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatPhone(phoneInput.value);
    });
  }


  /* ----- Валидация формы и отправка ----- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setMessage(text, ok) {
    if (!message) return;
    message.textContent = text || '';
    message.hidden = !text;
    message.classList.toggle('quiz__message--ok', !!ok);
  }

  function validateForm() {
    const name = form.name.value.trim();
    const phoneDigits = form.phone.value.replace(/\D/g, '');
    const email = form.email.value.trim();
    let firstInvalid = null;

    [form.name, form.phone, form.email].forEach(function (el) {
      el.classList.remove('is-invalid');
    });

    if (name.length < 2) { form.name.classList.add('is-invalid'); firstInvalid = firstInvalid || form.name; }
    if (phoneDigits.length < 11) { form.phone.classList.add('is-invalid'); firstInvalid = firstInvalid || form.phone; }
    if (!EMAIL_RE.test(email)) { form.email.classList.add('is-invalid'); firstInvalid = firstInvalid || form.email; }

    if (firstInvalid) {
      setMessage('Проверьте, пожалуйста, заполненные поля.', false);
      firstInvalid.focus();
      return false;
    }
    setMessage('', false);
    return true;
  }

  const submitBtn = form.querySelector('[data-submit]');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validateForm()) return;

    if (submitBtn) { submitBtn.disabled = true; }
    setMessage('Отправляем заявку…', true);

    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (response) {
        return response.json().catch(function () { return { ok: response.ok }; });
      })
      .then(function (result) {
        if (result && result.ok) {
          setMessage('', false);
          showStep(SUCCESS_STEP);
        } else {
          setMessage((result && result.error) || 'Не удалось отправить заявку. Попробуйте позже.', false);
        }
      })
      .catch(function () {
        setMessage('Ошибка сети. Проверьте соединение и попробуйте снова.', false);
      })
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; }
      });
  });

  // Стартовое состояние
  showStep(1);
});
