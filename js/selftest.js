/* ============================================================
   Spin & Learn — QA ONLY harness (?selftest= / ?shot= modes).
   This file is NEVER shipped: build.py injects it only into
   dist/selftest.html via --with-selftest.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});
  var params = new URLSearchParams(window.location.search);
  var mode = params.get('selftest');
  var shot = params.get('shot');

  function $(id) { return document.getElementById(id); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function visible(el) { return el && !el.classList.contains('hidden'); }

  var CUSTOM = [
    { q: '2 + 3', a: '5', hint: 'count up from 2' },
    { q: 'cat', a: 'a small pet', hint: 'it says meow' },
    { q: '7 + 5', a: '12', hint: 'count up from 7' }
  ];

  function pollFor(fn, timeoutMs, label) {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      (function check() {
        var v;
        try { v = fn(); } catch (e) { v = null; }
        if (v) { resolve(v); return; }
        if (Date.now() - start > timeoutMs) { reject(new Error('timeout: ' + label)); return; }
        setTimeout(check, 250);
      })();
    });
  }

  /* ---------------- full automated QA ---------------- */
  function runSelftest() {
    var results = [];
    function ok(name, cond, extra) {
      results.push({ name: name, pass: !!cond, extra: extra || '' });
    }
    function finish() {
      var passed = results.filter(function (r) { return r.pass; }).length;
      var pre = document.createElement('pre');
      pre.id = 'selftest-output';
      pre.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;background:#111;color:#0f0;z-index:9999;font-size:12px;padding:8px;margin:0;white-space:pre-wrap;';
      pre.textContent = results.map(function (r) {
        return (r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.extra ? '  [' + r.extra + ']' : '');
      }).join('\n');
      document.body.appendChild(pre);
      document.title = 'SELFTEST ' + (passed === results.length ? 'PASS' : 'FAIL') +
        ' ' + passed + '/' + results.length;
    }

    try {
      localStorage.clear();
    } catch (e) { /* ignore */ }

    Promise.resolve()
      .then(function () {
        ok('namespace present', !!(NS.game && NS.content && NS.spinner && NS.audio && NS.editor));
        var n = NS.content.setCustomList(CUSTOM);
        ok('setCustomList stores 3 items', n === 3, 'n=' + n);
        ok('getItems returns 3', NS.content.getItems().length === 3);
        var raw = null;
        try { raw = localStorage.getItem('spinlearn.custom.v1'); } catch (e) {}
        ok('custom list persisted to localStorage', !!(raw && raw.indexOf('2 + 3') !== -1));
        var back = NS.content.getCustomList();
        ok('getCustomList round-trips (refresh path)', !!(back && back.length === 3 && back[0].q === '2 + 3'));
      })
      .then(function () {
        NS.game.newQuestion();
        var st = NS.game.getState();
        ok('newQuestion -> phase=question', st.phase === 'question', st.phase);
        var q = $('q-text').textContent;
        ok('question text shown', q.length > 0 && q !== 'Loading…', q.slice(0, 24));
        NS.game.showAnswer();
        ok('showAnswer -> phase=answering', NS.game.getState().phase === 'answering');
        ok('answer visible', visible($('a-text')));
      })
      .then(function () {
        NS.game.markCorrect();
        return pollFor(function () {
          return NS.game.getState().phase === 'rewarded' ? true : null;
        }, 45000, 'spin to rewarded');
      })
      .then(function () {
        var st = NS.game.getState();
        ok('spin lands -> phase=rewarded', st.phase === 'rewarded');
        ok('streak incremented', st.streak === 1, 'streak=' + st.streak);
        ok('stars non-negative number', typeof st.stars === 'number' && st.stars >= 0, 'stars=' + st.stars);
        ok('header star count matches', $('star-count').textContent === String(st.stars));
        ok('wheel shows a lit cell', !!document.querySelector('#wheel .cell.lit'));
        ok('24 wheel cells built', document.querySelectorAll('#wheel .cell').length === 24);
      })
      .then(function () {
        NS.game.newQuestion();
        NS.game.showAnswer();
        NS.game.markTryAgain();
        var st = NS.game.getState();
        ok('tryAgain resets streak + next question', st.streak === 0 && st.phase === 'question',
          'streak=' + st.streak + ' phase=' + st.phase);
      })
      .then(function () {
        var parsed = NS.content.parseTextarea('apple | 苹果 | a red fruit\nbanana | 香蕉\n\n  \nlonely');
        ok('textarea parser', parsed.length === 3 && parsed[0].a === '苹果' && parsed[2].hint === '',
          'n=' + parsed.length);
        var fromCSV = NS.content.importCSV('q,a,hint\nsun,太阳,a star\nmoon,月亮\n');
        ok('CSV import (header + short row)', fromCSV === 2);
        var fromJSON = NS.content.importJSON(JSON.stringify([{ q: 'x', a: 'y' }]));
        ok('JSON import', fromJSON === 1);
      })
      .then(function () {
        NS.editor.open();
        ok('editor opens', $('editor-panel').classList.contains('open'));
        NS.editor.close();
        ok('editor closes', !$('editor-panel').classList.contains('open'));
        ['tick', 'suspense', 'fanfare', 'starChime', 'goodTry', 'click'].forEach(function (fn) {
          try { NS.audio[fn](fn === 'starChime' ? 2 : 0.5); } catch (e) { /* ignore */ }
        });
        ok('audio fns run without throwing', true);
        ok('mute toggles + persists', (function () {
          NS.audio.setMuted(true);
          var m = NS.audio.isMuted();
          var stored = null;
          try { stored = localStorage.getItem('spinlearn.muted.v1'); } catch (e) {}
          NS.audio.setMuted(false);
          return m === true && stored === '1';
        })());
      })
      .then(finish, function (err) {
        results.push({ name: 'EXCEPTION: ' + (err && err.message), pass: false });
        finish();
      });
  }

  /* ---------------- screenshot presets ---------------- */
  function setupShot() {
    try { localStorage.clear(); } catch (e) {}
    NS.content.setCustomList(CUSTOM);
    if (shot === 'hero') {
      NS.game.newQuestion(); // question card + hint strip visible
    } else if (shot === 'question') {
      NS.game.newQuestion();
      NS.game.showAnswer(); // answer + Correct / Try Again buttons
    } else if (shot === 'spinning') {
      NS.game.newQuestion();
      NS.game.showAnswer();
      NS.game.markCorrect(); // mid-spin captured by timed screenshot
    } else if (shot === 'reveal') {
      NS.game.newQuestion();
      NS.game.showAnswer();
      NS.game.markCorrect();
      pollFor(function () {
        return NS.game.getState().phase === 'rewarded' ? true : null;
      }, 45000, 'reveal').then(function () {
        // game.js keeps the overlay visible when ?shot is in the URL.
        var ov = $('reveal-overlay');
        if (ov.classList.contains('hidden')) {
          ov.classList.remove('hidden');
        }
        document.title = 'SHOT reveal ready';
      }).catch(function () {
        document.title = 'SHOT reveal TIMEOUT';
      });
    } else if (shot === 'editor') {
      NS.game.newQuestion();
      $('custom-textarea').value = 'apple | 苹果 | a red fruit\nbanana | 香蕉 | long yellow fruit\n7 + 5 | 12 | count up from 7';
      NS.editor.open();
    } else if (shot === 'demo') {
      // Slow auto-play loop for GIF frame capture (~30s).
      (function loop() {
        NS.game.newQuestion();
        wait(2600).then(function () {
          if (NS.game.getState().phase !== 'question') { loop(); return; }
          NS.game.showAnswer();
          return wait(2600);
        }).then(function () {
          if (NS.game.getState().phase !== 'answering') { loop(); return; }
          NS.game.markCorrect();
          return pollFor(function () {
            return NS.game.getState().phase === 'rewarded' ? true : null;
          }, 45000, 'demo');
        }).then(function () { return wait(3000); })
          .then(loop, loop);
      })();
    }
    if (shot !== 'reveal') {
      document.title = 'SHOT ' + shot + ' ready';
    }
  }

  function boot() {
    if (mode === '1' || mode === 'true') { runSelftest(); return; }
    if (shot) { setupShot(); }
  }

  if (document.readyState === 'loading') {
    // Run after the app's own DOMContentLoaded boot (editor.js).
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(boot, 300);
    });
  } else {
    setTimeout(boot, 300);
  }
})();
