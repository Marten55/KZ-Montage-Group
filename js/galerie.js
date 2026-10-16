/*!
 * galerie.js — KZ Montage Group gallery page
 * Independent carousel state per [data-carousel] card. Vanilla, no autoplay.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-carousel]').forEach(initCarousel);

  function initCarousel(card) {
    var slides = card.querySelectorAll('.carousel__slide');
    var dots   = card.querySelectorAll('.carousel__dot');
    var prev   = card.querySelector('.carousel__prev');
    var next   = card.querySelector('.carousel__next');

    if (slides.length < 2) return; // single image — no nav needed

    var active = 0;

    function show(i) {
      var n = slides.length;
      var target = ((i % n) + n) % n; // wrap negative
      if (target === active) return;

      slides[active].classList.remove('is-active');
      if (dots[active]) dots[active].classList.remove('is-active');

      active = target;

      slides[active].classList.add('is-active');
      if (dots[active]) dots[active].classList.add('is-active');
    }

    if (prev) prev.addEventListener('click', function () { show(active - 1); });
    if (next) next.addEventListener('click', function () { show(active + 1); });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { show(i); });
    });

    // Keyboard nav when carousel has focus (clicking arrow/dot focuses it)
    card.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); show(active - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(active + 1); }
    });

    // Touch swipe (mobile)
    var touchStartX = 0;
    var touchEndX   = 0;
    var carousel = card.querySelector('.carousel');
    if (!carousel) return;

    carousel.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var dx = touchEndX - touchStartX;
      if (Math.abs(dx) > 40) {
        show(active + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }
})();

/*!
 * Video facade handler — poster + play button, replace with iframe on click.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-vid]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var vid = btn.dataset.vid;
      var wrap = btn.parentElement; // .video-facade-wrap
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.title = btn.getAttribute('aria-label') || 'Video';
      wrap.innerHTML = '';
      wrap.appendChild(iframe);
    });
  });
})();
