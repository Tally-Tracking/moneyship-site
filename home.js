// The space band on the home page. The stars drift, and in each half (debts
// and savings) the ship flies along its path to the next trophy or planet,
// lighting the 25, 50 and 75% checkpoints on the way and unlocking it when it
// lands. When every one is won, that half starts again. It runs only while the
// band is on screen and the tab is showing; "Reduce motion" shows a still
// frame with everything won.
(function () {
  'use strict';
  var band = document.getElementById('band');
  if (!band) return;

  var FLY_MS = 6500;    // one flight
  var LAND_MS = 1600;   // the prize shows after landing
  var FULL_MS = 3200;   // every prize won, before starting again
  var NOSE = 42;        // the ship sprite's nose, in px from its left edge (48 px drawn)
  var CHECKPOINTS = [0.25, 0.5, 0.75];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function Lane(world, delayMs) {
    var lane = world.querySelector('.lane');
    this.bar = lane.querySelector('.bar');
    this.fill = lane.querySelector('.fill');
    this.ship = lane.querySelector('.ship');
    this.goal = lane.querySelector('.goal');
    this.dots = Array.prototype.slice.call(lane.querySelectorAll('.dot'));
    this.items = Array.prototype.slice.call(world.querySelectorAll('.shelf li'));
    this.prizes = this.items.map(function (li) { return li.querySelector('img').getAttribute('src'); });
    this.delay = delayMs;
    this.index = 0;
    this.phase = 'wait';
    this.t = 0;          // ms into the current phase
  }

  Lane.prototype.place = function (p) {
    var nose = p * this.bar.clientWidth;
    this.fill.style.width = nose + 'px';
    this.ship.style.left = Math.max(NOSE, nose) + 'px';
  };

  Lane.prototype.lock = function (li, locked) {
    li.classList.toggle('locked', locked);
    li.classList.toggle('won', !locked);
  };

  Lane.prototype.flyTo = function (i) {
    this.index = i;
    this.phase = 'fly';
    this.t = 0;
    this.goal.src = this.prizes[i];
    this.goal.classList.add('locked');
    this.dots.forEach(function (d) { d.classList.remove('hit'); });
    this.place(0);
  };

  Lane.prototype.reset = function () {
    var self = this;
    this.items.forEach(function (li) { self.lock(li, true); });
    this.goal.src = this.prizes[0];
    this.goal.classList.add('locked');
    this.dots.forEach(function (d) { d.classList.remove('hit'); });
    this.place(0);
    this.phase = 'wait';
    this.t = 0;
  };

  Lane.prototype.still = function () {
    var self = this;
    this.items.forEach(function (li) { self.lock(li, false); });
    this.dots.forEach(function (d) { d.classList.add('hit'); });
    this.goal.src = this.prizes[this.prizes.length - 1];
    this.goal.classList.remove('locked');
    this.place(1);
  };

  Lane.prototype.spark = function (dot) {
    var s = document.createElement('span');
    s.className = 'spark go';
    s.style.left = dot.style.left;
    this.bar.appendChild(s);
    setTimeout(function () { s.remove(); }, 500);
  };

  Lane.prototype.step = function (dt) {
    this.t += dt;
    if (this.phase === 'wait') {
      if (this.t >= this.delay) this.flyTo(0);
    } else if (this.phase === 'fly') {
      var p = ease(Math.min(1, this.t / FLY_MS));
      this.place(p);
      for (var k = 0; k < CHECKPOINTS.length; k++) {
        if (p >= CHECKPOINTS[k] && !this.dots[k].classList.contains('hit')) {
          this.dots[k].classList.add('hit');
          this.spark(this.dots[k]);
        }
      }
      if (this.t >= FLY_MS) {
        this.goal.classList.remove('locked');
        this.lock(this.items[this.index], false);
        this.phase = this.index === this.prizes.length - 1 ? 'full' : 'land';
        this.t = 0;
      }
    } else if (this.phase === 'land' && this.t >= LAND_MS) {
      this.flyTo(this.index + 1);
    } else if (this.phase === 'full' && this.t >= FULL_MS) {
      this.reset();
      this.delay = 0;
    }
  };

  var lanes = [];
  var debts = document.getElementById('debts');
  var savings = document.getElementById('savings');
  if (debts) lanes.push(new Lane(debts, 0));
  if (savings) lanes.push(new Lane(savings, 2400));

  if (reduced) {
    lanes.forEach(function (l) { l.still(); });
    return;
  }

  lanes.forEach(function (l) { l.reset(); });
  var running = false;
  var visible = false;
  var last = null;
  var raf = 0;

  function frame(now) {
    if (!running) return;
    // Cap a step so a stalled frame never jumps the ship along.
    var dt = last === null ? 0 : Math.min(100, now - last);
    last = now;
    lanes.forEach(function (l) { l.step(dt); });
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var shouldRun = visible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    band.classList.toggle('moving', shouldRun);
    if (shouldRun) {
      last = null;
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  document.addEventListener('visibilitychange', update);
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
