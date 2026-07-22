'use strict';

/* =====================================================================
   ПОВЕЛИТЕЛЬ ОГНЯ — скрипты
   Пока лендинг статичный (шапка + первый экран).
   Здесь будут: бургер-меню и валидация формы обратной связи.
   ===================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  // Плавная прокрутка по якорным ссылкам (кроме пустых "#")
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
});
