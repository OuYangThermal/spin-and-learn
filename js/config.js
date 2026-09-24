/* ============================================================
   Spin & Learn — Classroom Reward Spinner
   config: shared constants (reward table, storage keys).
   No frameworks, no modules — everything lives on window.SpinLearn.
   ============================================================ */
(function () {
  'use strict';

  function buildRewards() {
    var rewards = [];
    function add(count, entry) {
      for (var i = 0; i < count; i++) {
        rewards.push({
          kind: entry.kind,
          n: entry.n,
          emoji: entry.emoji,
          label: entry.label
        });
      }
    }
    // 24 cells total: 10 + 6 + 3 + 2 + 2 + 1
    add(10, { kind: 'stars', n: 1, emoji: '⭐', label: '+1' });
    add(6,  { kind: 'stars', n: 2, emoji: '⭐⭐', label: '+2' });
    add(3,  { kind: 'stars', n: 3, emoji: '⭐⭐⭐', label: '+3' });
    add(2,  { kind: 'cheer', n: 0, emoji: '🎉', label: 'Cheer' });
    add(2,  { kind: 'again', n: 0, emoji: '🔁', label: 'Again' });
    add(1,  { kind: 'mystery', n: 0, emoji: '🎁', label: '?' });
    return rewards;
  }

  window.SpinLearn = window.SpinLearn || {};
  window.SpinLearn.config = {
    // true = free online demo (file import/export gated); the paid
    // single-file download is built with demoMode: false (see build.py).
    demoMode: true,
    storageKeys: {
      custom: 'spinlearn.custom.v1',
      muted: 'spinlearn.muted.v1',
      hint: 'spinlearn.hint.v1'
    },
    rewards: buildRewards()
  };
})();
