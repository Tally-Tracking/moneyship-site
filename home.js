// The space band on the home page: the stars drift, and the ship flies along
// its path to each trophy in turn, lighting the 25, 50 and 75% checkpoints on
// the way and unlocking the trophy when it lands. It runs only while the band
// is on screen and the tab is showing; "Reduce motion" shows a still frame,
// and the pause button stops everything that moves (WCAG 2.2.2).
(function () {
  'use strict';
  var band = document.getElementById('band');
  var lane = document.getElementById('lane');
  if (!band || !lane) return;
  var bar = lane.querySelector('.bar');
  var fill = document.getElementById('fill');
  var ship = document.getElementById('ship');
  var goal = document.getElementById('goal');
  var pause = document.getElementById('pause');
  var shelf = Array.prototype.slice.call(document.querySelectorAll('#shelf li'));
  var dots = Array.prototype.slice.call(lane.querySelectorAll('.dot'));
  var trophies = shelf.map(function (li) { return li.querySelector('img').getAttribute('src'); });

  var FLY_MS = 6500;    // one flight
  var LAND_MS = 1600;   // the trophy shows after landing
  var FULL_MS = 3200;   // every trophy won, before starting again
  var NOSE = 56;        // the ship sprite's nose, in px from its left edge (64 px drawn)
  var CHECKPOINTS = [0.25, 0.5, 0.75];

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function place(p) {
    var w = bar.clientWidth;
    var nose = p * w;
    fill.style.width = nose + 'px';
    ship.style.left = Math.max(NOSE, nose) + 'px';
  }

  function spark(dot) {
    var s = document.createElement('span');
    s.className = 'spark go';
    s.style.left = dot.style.left;
    bar.appendChild(s);
    setTimeout(function () { s.remove(); }, 500);
  }

  function setLocked(li, locked) {
    li.classList.toggle('locked', locked);
    li.classList.toggle('won', !locked);
  }

  // Still frame: every trophy won, the ship landed.
  function still() {
    shelf.forEach(function (li) { setLocked(li, false); });
    dots.forEach(function (d) { d.classList.add('hit'); });
    goal.src = trophies[trophies.length - 1];
    goal.classList.remove('locked');
    place(1);
  }

  if (reduced) { still(); return; }

  pause.hidden = false;
  var index = 0;        // which trophy the ship is flying to
  var phase = 'fly';    // fly, land, full
  var phaseStart = null;
  var elapsedBeforePause = 0;
  var running = false;
  var userPaused = false;
  var visible = false;
  var raf = 0;

  function startFlight(i) {
    index = i;
    phase = 'fly';
    goal.src = trophies[i];
    goal.classList.add('locked');
    dots.forEach(function (d) { d.classList.remove('hit'); });
    place(0);
  }

  function resetAll() {
    shelf.forEach(function (li) { setLocked(li, true); });
    startFlight(0);
  }

  function frame(now) {
    if (!running) return;
    if (phaseStart === null) phaseStart = now - elapsedBeforePause;
    var t = now - phaseStart;
    if (phase === 'fly') {
      var p = ease(Math.min(1, t / FLY_MS));
      place(p);
      CHECKPOINTS.forEach(function (c, k) {
        if (p >= c && !dots[k].classList.contains('hit')) { dots[k].classList.add('hit'); spark(dots[k]); }
      });
      if (t >= FLY_MS) {
        goal.classList.remove('locked');
        setLocked(shelf[index], false);
        phase = index === trophies.length - 1 ? 'full' : 'land';
        phaseStart = now;
      }
    } else if (phase === 'land' && t >= LAND_MS) {
      startFlight(index + 1);
      phaseStart = now;
    } else if (phase === 'full' && t >= FULL_MS) {
      resetAll();
      phaseStart = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var shouldRun = visible && !userPaused && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    band.classList.toggle('moving', shouldRun);
    if (shouldRun) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      if (phaseStart !== null) elapsedBeforePause = performance.now() - phaseStart;
      phaseStart = null;
    }
  }

  pause.addEventListener('click', function () {
    userPaused = !userPaused;
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? 'Play the animation' : 'Pause the animation');
    pause.innerHTML = userPaused
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"></path></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>';
    update();
  });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('resize', function () { if (!running && phase !== 'fly') place(1); });

  resetAll();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.15 }).observe(band);
  } else {
    visible = true;
    update();
  }
})();
