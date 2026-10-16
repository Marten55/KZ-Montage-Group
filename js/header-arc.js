/*!
 * header-arc.js — KZ Montage Group
 * Welding arc: pulsing glow line + spark particle effect on the fixed header.
 *
 * No external dependencies. Particle pool, rAF loop, visibilitychange pause,
 * prefers-reduced-motion gate, desktop-only particles.
 */
(function () {
  'use strict';

  var TAU       = Math.PI * 2;
  var POOL_SIZE = 40;
  var CANVAS_H  = 100; // logical px — covers max spark travel at 800ms lifespan

  var REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqlDesk  = window.matchMedia('(min-width: 768px)');

  // ── Header ──────────────────────────────────────────────────────────────────
  var header = document.querySelector('.topbar');
  if (!header) return;
  header.classList.add('topbar--arc');

  // ── Arc line (real element — avoids var() in rgba() in box-shadow bug) ──────
  var arcLine = document.createElement('div');
  arcLine.id = 'arc-line';
  arcLine.setAttribute('aria-hidden', 'true');
  header.appendChild(arcLine);

  // ── Canvas ──────────────────────────────────────────────────────────────────
  var canvas = document.createElement('canvas');
  canvas.id = 'arc-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = 1;
  var W   = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    // clientWidth excludes the scrollbar gutter — innerWidth would make the
    // canvas wider than the scrollable area and register as horizontal overflow.
    W   = document.documentElement.clientWidth;
    // Assigning canvas.width resets the context state — scale is re-applied below
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ── Particle pool ────────────────────────────────────────────────────────────
  var pool = [];
  for (var i = 0; i < POOL_SIZE; i++) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0 });
  }

  function spawn() {
    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      if (!p.active) {
        p.active  = true;
        p.x       = Math.random() * W;
        p.y       = 0;
        p.vx      = (Math.random() - 0.5) * 2.8;
        p.vy      = 0.2 + Math.random() * 0.8;
        p.life    = 0;
        p.maxLife = 400 + Math.random() * 400; // 400–800 ms
        p.r       = 0.8 + Math.random() * 1.4;
        return;
      }
    }
    // Pool exhausted — silently skip
  }

  // ── State ────────────────────────────────────────────────────────────────────
  var hovering    = false;
  var hoverBlend  = 0;                        // 0 = idle, 1 = hover, eased
  var glowPhase   = Math.random() * TAU;      // random start so first tick isn't phase 0
  var nextSpawnTs = 0;
  var lastTs      = 0;
  var raf         = null;

  // ── Hover ────────────────────────────────────────────────────────────────────
  header.addEventListener('mouseenter', function () { hovering = true; });
  header.addEventListener('mouseleave', function () { hovering = false; });

  // ── Loop ─────────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(ts - lastTs, 50); // cap at 50 ms (tab-focus catch-up prevention)
    lastTs = ts;

    // Ease hover blend (~280 ms half-life)
    hoverBlend += ((hovering ? 1 : 0) - hoverBlend) * (dt / 280);
    if (hoverBlend < 0.001) hoverBlend = 0;
    if (hoverBlend > 0.999) hoverBlend = 1;

    // ── Glow pulse — two detuned oscillators → irregular feel ──────────────────
    glowPhase += dt * 0.00085;
    var osc1  = (Math.sin(glowPhase * 1.37) + 1) * 0.5;        // 0–1
    var osc2  = (Math.sin(glowPhase * 0.63 + 1.05) + 1) * 0.5; // 0–1
    var pulse = osc1 * 0.6 + osc2 * 0.4;                       // 0–1 blended
    // At full hover, pulse is overridden by a solid 1
    var glow  = pulse * (1 - hoverBlend) + hoverBlend;

    // Compute shadow values as plain numbers — set directly on real DOM element,
    // no CSS custom props in rgba() which breaks on soft reload in some browsers.
    var aNear = (0.38 + glow * 0.62).toFixed(3);
    var aMid  = (0.12 + glow * 0.33).toFixed(3);
    var aFar  = (0.05 + glow * 0.18).toFixed(3);
    var near  = (1.5  + glow * 5.5 ).toFixed(1) + 'px';
    var mid   = (5    + glow * 14  ).toFixed(1) + 'px';
    var far   = (12   + glow * 28  ).toFixed(1) + 'px';

    arcLine.style.boxShadow =
      '0 0 ' + near + ' rgba(200,230,255,' + aNear + '),' +
      '0 0 ' + mid  + ' rgba(106,184,255,' + aMid  + '),' +
      '0 0 ' + far  + ' rgba(106,184,255,' + aFar  + ')';

    // ── Particles (desktop + motion allowed) ────────────────────────────────────
    var wantParticles = !REDUCED && mqlDesk.matches;

    ctx.clearRect(0, 0, W, CANVAS_H);

    if (wantParticles) {
      // Spawn
      if (ts >= nextSpawnTs) {
        spawn();

        // Extra bursts at high hover intensity
        if (hoverBlend > 0.75 && Math.random() < hoverBlend) {
          var extra = Math.ceil(Math.random() * 2); // 1–2 bonus
          for (var k = 0; k < extra; k++) spawn();
        }

        if (hovering || hoverBlend > 0.1) {
          var rate = 5 + hoverBlend * 5; // 5–10 sparks/s during hover
          nextSpawnTs = ts + 1000 / rate;
        } else {
          nextSpawnTs = ts + 1000 + Math.random() * 1000; // 1–2 s idle
        }
      }

      // Update + draw
      for (var i = 0; i < POOL_SIZE; i++) {
        var p = pool[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) { p.active = false; continue; }

        var t = p.life / p.maxLife; // 0 → 1

        // Physics: constant horizontal drift + accelerating gravity
        p.vy += dt * 0.003;
        p.x  += p.vx * (dt / 16);
        p.y  += p.vy * (dt / 16);

        if (p.y > CANVAS_H) { p.active = false; continue; }

        // Alpha: ease-out so sparks stay bright, then drop quickly
        var alpha = Math.pow(1 - t, 1.6);

        // Color: blue-white at spawn → warm white as they cool
        var cr = Math.round(215 + t * 40);  // 215 → 255
        var cg = Math.round(235 + t *  8);  // 235 → 243
        var cb = Math.round(255 - t * 50);  // 255 → 205

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
        ctx.shadowBlur  = p.r * 5;
        ctx.fillStyle   = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - t * 0.35), 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    raf = requestAnimationFrame(loop);
  }

  // ── Run gating ────────────────────────────────────────────────────────────────
  // Loop runs only on desktop with motion allowed. Below 768 the canvas is hidden
  // and the rAF loop never starts — no per-frame work, no battery drain. The arc
  // line falls back to its static CSS box-shadow (no inline override to fight it,
  // which also stops reduced-motion users from getting an animated glow).
  function shouldRun() { return !REDUCED && mqlDesk.matches; }

  function startLoop() {
    if (raf || !shouldRun()) return;
    lastTs = 0; // reset dt so the first frame doesn't jump
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function applyMode() {
    if (shouldRun()) {
      canvas.style.display = '';
      startLoop();
    } else {
      stopLoop();
      canvas.style.display = 'none';
      arcLine.style.boxShadow = ''; // drop inline override → CSS static glow shows
    }
  }

  // ── Pause when tab hidden ─────────────────────────────────────────────────────
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopLoop(); }
    else { startLoop(); }
  });

  // ── React to crossing the desktop breakpoint (rotate / resize) ────────────────
  var mqlListener = function () { applyMode(); };
  if (mqlDesk.addEventListener) { mqlDesk.addEventListener('change', mqlListener); }
  else if (mqlDesk.addListener) { mqlDesk.addListener(mqlListener); } // Safari < 14

  applyMode();
})();
