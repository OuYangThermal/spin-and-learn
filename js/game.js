/* ============================================================
   Spin & Learn — game flow controller.
   Phases: idle -> question -> answering -> spinning -> reveal
   -> rewarded. Correct answers earn a weighted wheel spin;
   wrong answers get an encouraging sound and the next question.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});

  function $(id) {
    return document.getElementById(id);
  }
  function show(el) {
    el.classList.remove('hidden');
  }
  function hide(el) {
    el.classList.add('hidden');
  }

  var state = { stars: 0, streak: 0, phase: 'idle', currentItem: null };
  var pool = []; // indexes not yet asked (shuffled, no repeats)
  var spinning = false;
  var revealTimer = null;

  function shuffled(n) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push(i);
    }
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function renderScores() {
    $('star-count').textContent = String(state.stars);
    $('streak-count').textContent = String(state.streak);
    $('wheel-center-stars').textContent = '⭐ ' + state.stars;
  }

  function newQuestion() {
    if (spinning) {
      return;
    }
    var list = NS.content.getItems();
    if (!list.length) {
      state.phase = 'idle';
      state.currentItem = null;
      $('q-text').textContent = 'No words yet — open “Word Lists” to add some! 📝';
      hide($('q-hint'));
      hide($('a-text'));
      hide($('btn-hint'));
      hide($('btn-show-answer'));
      hide($('btn-correct'));
      hide($('btn-tryagain'));
      hide($('btn-skip'));
      hide($('btn-next'));
      return;
    }
    if (!pool.length) {
      pool = shuffled(list.length);
    }
    var idx = pool.pop();
    state.currentItem = list[idx];
    state.phase = 'question';
    $('q-text').textContent = state.currentItem.q;
    $('q-hint').textContent = state.currentItem.hint || '(No hint for this one)';
    $('a-text').textContent = state.currentItem.a || '(Open answer)';
    hide($('q-hint'));
    hide($('a-text'));
    show($('btn-hint'));
    show($('btn-show-answer'));
    show($('btn-skip'));
    hide($('btn-correct'));
    hide($('btn-tryagain'));
    hide($('btn-next'));
  }

  function showAnswer() {
    if (state.phase !== 'question' || !state.currentItem) {
      return;
    }
    NS.audio.click();
    show($('a-text'));
    hide($('btn-show-answer'));
    show($('btn-correct'));
    show($('btn-tryagain'));
    state.phase = 'answering';
  }

  function toggleHint() {
    NS.audio.click();
    $('q-hint').classList.toggle('hidden');
  }

  /* Weighted reward draw: 50% +1, 25% +2, 12% +3, 5% cheer, 5% again, 3% mystery. */
  function pickReward() {
    var r = Math.random();
    if (r < 0.5) {
      return { kind: 'stars', n: 1 };
    }
    if (r < 0.75) {
      return { kind: 'stars', n: 2 };
    }
    if (r < 0.87) {
      return { kind: 'stars', n: 3 };
    }
    if (r < 0.92) {
      return { kind: 'cheer' };
    }
    if (r < 0.97) {
      return { kind: 'again' };
    }
    return { kind: 'mystery' };
  }

  function pickNonAgain() {
    var p = pickReward();
    while (p.kind === 'again') {
      p = pickReward();
    }
    return p;
  }

  /* A random wheel cell index holding the requested reward kind. */
  function cellIndexFor(kind, n) {
    var rewards = NS.config.rewards;
    var matches = [];
    for (var i = 0; i < rewards.length; i++) {
      if (rewards[i].kind !== kind) {
        continue;
      }
      if (kind === 'stars' && rewards[i].n !== n) {
        continue;
      }
      matches.push(i);
    }
    if (!matches.length) {
      return Math.floor(Math.random() * rewards.length);
    }
    return matches[Math.floor(Math.random() * matches.length)];
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function reveal(emoji, title, sub) {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    $('reveal-emoji').textContent = emoji;
    $('reveal-title').textContent = title;
    $('reveal-sub').textContent = sub || '';
    show($('reveal-overlay'));
    // Screenshot hook: ?shot in the URL keeps the overlay visible.
    if (window.location.search.indexOf('shot') === -1) {
      revealTimer = setTimeout(hideReveal, 2500);
    }
  }

  function hideReveal() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    hide($('reveal-overlay'));
  }

  function confetti() {
    var emojis = ['⭐', '🎉', '✨', '🎊', '🌟'];
    for (var i = 0; i < 48; i++) {
      (function (i) {
        var s = document.createElement('span');
        s.className = 'confetti-piece';
        s.textContent = emojis[i % emojis.length];
        s.style.left = Math.random() * 100 + 'vw';
        s.style.fontSize = 16 + Math.random() * 26 + 'px';
        s.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
        s.style.animationDelay = Math.random() * 0.4 + 's';
        document.body.appendChild(s);
        setTimeout(function () {
          s.remove();
        }, 3800);
      })(i);
    }
  }

  function applyReward(reward) {
    if (reward.kind === 'stars') {
      state.stars += reward.n;
      NS.audio.starChime(reward.n);
      reveal(
        reward.emoji,
        '+' + reward.n + (reward.n > 1 ? ' Stars' : ' Star'),
        state.streak > 1 ? 'Streak 🔥 ' + state.streak + ' — keep it going!' : 'Great work, class!'
      );
    } else if (reward.kind === 'cheer') {
      NS.audio.fanfare();
      confetti();
      reveal('🎉', 'Class Cheer!', 'Everybody celebrate together!');
    } else if (reward.kind === 'mystery') {
      var n = 1 + Math.floor(Math.random() * 5); // 1–5 stars
      state.stars += n;
      NS.audio.starChime(n);
      reveal('🎁', 'Mystery! +' + n + (n > 1 ? ' Stars' : ' Star'), 'A surprise for the class!');
    }
    renderScores();
    return Promise.resolve();
  }

  /* One spin; 'again' cells chain into another spin (max chain of 3). */
  function spinSequence(chain) {
    var pick = chain >= 3 ? pickNonAgain() : pickReward();
    var target = cellIndexFor(pick.kind, pick.n);
    return NS.spinner.runTo(target).then(function () {
      var reward = NS.config.rewards[target];
      if (reward.kind === 'again' && chain < 3) {
        reveal('🔁', 'Spin Again!', 'The wheel spins once more…');
        return wait(1500).then(function () {
          hideReveal();
          return spinSequence(chain + 1);
        });
      }
      return applyReward(reward);
    });
  }

  function markCorrect() {
    if (state.phase !== 'answering' || spinning) {
      return;
    }
    spinning = true;
    state.phase = 'spinning';
    state.streak += 1;
    renderScores();
    hide($('btn-correct'));
    hide($('btn-tryagain'));
    hide($('btn-hint'));
    hide($('btn-skip')); // after a correct answer, only "Next →" remains
    spinSequence(0).then(function () {
      spinning = false;
      state.phase = 'rewarded';
      show($('btn-next'));
    });
  }

  function markTryAgain() {
    if (spinning) {
      return;
    }
    if (state.phase !== 'answering' && state.phase !== 'question') {
      return;
    }
    NS.audio.goodTry();
    state.streak = 0;
    renderScores();
    newQuestion();
  }

  function skip() {
    if (spinning) {
      return;
    }
    NS.audio.click();
    newQuestion();
  }

  function reset() {
    if (!window.confirm('Reset stars and streak to zero?')) {
      return;
    }
    state.stars = 0;
    state.streak = 0;
    renderScores();
    if (!spinning) {
      newQuestion();
    }
  }

  function getState() {
    return { stars: state.stars, streak: state.streak, phase: state.phase };
  }

  function toggleSound() {
    NS.audio.init();
    NS.audio.setMuted(!NS.audio.isMuted());
    $('btn-sound').textContent = NS.audio.isMuted() ? '🔇' : '🔊';
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function dismissHint() {
    NS.audio.click();
    hide($('hint-strip'));
    try {
      localStorage.setItem(NS.config.storageKeys.hint, '1');
    } catch (e) { /* ignore */ }
  }

  function init() {
    NS.spinner.build($('wheel'), NS.config.rewards);
    renderScores();

    var gestureInit = function () {
      NS.audio.init();
    };
    window.addEventListener('pointerdown', gestureInit, { once: true });
    window.addEventListener('keydown', gestureInit, { once: true });

    $('btn-show-answer').addEventListener('click', showAnswer);
    $('btn-correct').addEventListener('click', markCorrect);
    $('btn-tryagain').addEventListener('click', markTryAgain);
    $('btn-skip').addEventListener('click', skip);
    $('btn-next').addEventListener('click', function () {
      NS.audio.click();
      newQuestion();
    });
    $('btn-hint').addEventListener('click', toggleHint);
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-fullscreen').addEventListener('click', toggleFullscreen);
    $('btn-reset').addEventListener('click', reset);
    $('btn-wordlist').addEventListener('click', function () {
      NS.audio.click();
      NS.editor.open();
    });
    $('hint-dismiss').addEventListener('click', dismissHint);
    $('btn-reveal-ok').addEventListener('click', hideReveal);

    if (NS.audio.isMuted()) {
      $('btn-sound').textContent = '🔇';
    }

    // First visit shows the hint strip; dismissal persists.
    try {
      if (localStorage.getItem(NS.config.storageKeys.hint)) {
        hide($('hint-strip'));
      }
    } catch (e) { /* ignore */ }

    NS.content.onChange(function () {
      pool = [];
      if (!spinning) {
        newQuestion();
      }
    });

    // Prefer the teacher's saved custom list; otherwise load ESL Basic.
    var custom = NS.content.getCustomList();
    if (custom && custom.length) {
      NS.content.setCustomList(custom);
    } else {
      NS.content.loadPack('esl-basic');
    }
  }

  NS.game = {
    init: init,
    newQuestion: newQuestion,
    showAnswer: showAnswer,
    markCorrect: markCorrect,
    markTryAgain: markTryAgain,
    skip: skip,
    reset: reset,
    getState: getState
  };
})();
