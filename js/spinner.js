/* ============================================================
   Spin & Learn — the reward wheel (24-cell light runner).
   build(wheelEl, rewards): places 24 .cell divs in a circle.
     Cell i sits at angle i*15deg via rotate(a) translateY(-r);
     the inner content is counter-rotated so the emoji stays upright.
   runTo(targetIndex, profile): returns a Promise that spins the
     highlight with accelerate -> cruise -> decelerate -> suspense
     dwell -> slow final steps, landing exactly on targetIndex,
     then resolves with targetIndex. The lit cell uses .lit.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});

  var CELL_COUNT = 24;
  var STEP_DEG = 360 / CELL_COUNT; // 15 degrees per cell

  var currentIndex = 0;
  var running = false;

  function setLit(wheelEl, idx) {
    var lit = wheelEl.querySelectorAll('.cell.lit');
    for (var i = 0; i < lit.length; i++) {
      lit[i].classList.remove('lit');
    }
    var cell = wheelEl.querySelector('.cell[data-index="' + idx + '"]');
    if (cell) {
      cell.classList.add('lit');
    }
  }

  function build(wheelEl, rewards) {
    var old = wheelEl.querySelectorAll('.cell');
    for (var k = 0; k < old.length; k++) {
      old[k].remove();
    }
    var wheelSize = wheelEl.clientWidth || 400;
    var ringR = wheelSize / 2 - 58; // center -> cell-center distance
    for (var i = 0; i < rewards.length; i++) {
      (function (i) {
        var reward = rewards[i];
        var a = i * STEP_DEG;
        var cell = document.createElement('div');
        cell.className = 'cell kind-' + reward.kind;
        cell.setAttribute('data-index', String(i));
        cell.style.transform = 'rotate(' + a + 'deg) translateY(' + (-ringR) + 'px)';
        var inner = document.createElement('div');
        inner.className = 'cell-inner';
        inner.style.setProperty('--tilt', 'rotate(' + (-a) + 'deg)');
        var emoji = document.createElement('span');
        emoji.className = 'cell-emoji';
        emoji.textContent = reward.emoji;
        var label = document.createElement('span');
        label.className = 'cell-label';
        label.textContent = reward.label;
        inner.appendChild(emoji);
        inner.appendChild(label);
        cell.appendChild(inner);
        wheelEl.appendChild(cell);
      })(i);
    }
    currentIndex = 0;
    setLit(wheelEl, 0);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function advance(wheelEl, progress01) {
    currentIndex = (currentIndex + 1) % CELL_COUNT;
    setLit(wheelEl, currentIndex);
    if (NS.audio && NS.audio.tick) {
      NS.audio.tick(progress01);
    }
  }

  function runTo(targetIndex, profile) {
    profile = profile || {};
    if (running) {
      return Promise.resolve(targetIndex);
    }
    running = true;

    var wheelEl = document.getElementById('wheel');
    var accelSteps = profile.accelSteps || 8;
    var cruiseSteps = profile.cruiseSteps || Math.round(2.5 * CELL_COUNT);
    var decelSteps = profile.decelSteps || 14;
    var dwellMs = profile.dwellMs != null ? profile.dwellMs : 700;
    var finalStepMs = profile.finalStepMs || 430;

    // Per-step delays for the three phases.
    var delays = [];
    var i;
    for (i = 0; i < accelSteps; i++) {
      var t = accelSteps > 1 ? i / (accelSteps - 1) : 1;
      delays.push(140 - (140 - 55) * t); // ~140ms -> ~55ms
    }
    for (i = 0; i < cruiseSteps; i++) {
      delays.push(55); // steady cruise, ~2.5 revolutions
    }
    for (i = 0; i < decelSteps; i++) {
      var u = (i + 1) / decelSteps;
      delays.push(55 + (380 - 55) * u * u); // eases up to ~380ms
    }

    // Extra slow steps so the run lands exactly on the target cell.
    var planned = accelSteps + cruiseSteps + decelSteps;
    var afterPlanned = (currentIndex + planned) % CELL_COUNT;
    var finalSteps = (targetIndex - afterPlanned + CELL_COUNT) % CELL_COUNT;
    var total = planned + finalSteps;

    var done = 0;
    var chain = Promise.resolve();
    delays.forEach(function (d) {
      chain = chain.then(function () {
        done += 1;
        advance(wheelEl, done / (total + 1));
        return wait(d);
      });
    });
    chain = chain.then(function () {
      if (NS.audio && NS.audio.suspense) {
        NS.audio.suspense();
      }
      return wait(dwellMs); // 700ms suspense dwell
    });
    for (i = 0; i < finalSteps; i++) {
      chain = chain.then(function () {
        done += 1;
        advance(wheelEl, Math.min(1, done / (total + 1)));
        return wait(finalStepMs);
      });
    }
    return chain.then(function () {
      running = false;
      currentIndex = ((targetIndex % CELL_COUNT) + CELL_COUNT) % CELL_COUNT;
      setLit(wheelEl, currentIndex);
      return currentIndex;
    });
  }

  NS.spinner = {
    build: build,
    runTo: runTo,
    getCurrentIndex: function () {
      return currentIndex;
    }
  };
})();
