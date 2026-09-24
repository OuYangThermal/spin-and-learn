/* ============================================================
   Spin & Learn — synthesized sound effects.
   100% WebAudio synthesis: no audio files, no network.
   Call init() on the first user gesture; mute persists.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});
  var KEY = 'spinlearn.muted.v1';

  var ctx = null;
  var master = null;
  var muted = false;
  try {
    muted = localStorage.getItem(KEY) === '1';
  } catch (e) { /* storage unavailable — stay unmuted */ }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      return true;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return false;
    }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0.0001 : 0.9;
    master.connect(ctx.destination);
    return true;
  }

  /* One enveloped oscillator note. delay is in seconds from now. */
  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!ensure()) {
      return;
    }
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(Math.max(30, freq), t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.22, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function init() {
    ensure();
  }

  function setMuted(m) {
    muted = !!m;
    try {
      localStorage.setItem(KEY, muted ? '1' : '0');
    } catch (e) { /* ignore */ }
    if (master) {
      master.gain.value = muted ? 0.0001 : 0.9;
    }
  }

  function isMuted() {
    return muted;
  }

  /* Short blip that rises in pitch as the wheel run progresses (0..1). */
  function tick(progress01) {
    var p = Math.min(1, Math.max(0, progress01 || 0));
    tone(340 + p * 560, 0.07, 'square', 0.10);
  }

  /* Soft shimmer while the highlight hangs before the final steps. */
  function suspense() {
    tone(880, 1.1, 'sine', 0.07, 0);
    tone(1174.66, 1.1, 'sine', 0.055, 0.18);
    tone(1567.98, 1.1, 'sine', 0.045, 0.36);
  }

  /* Major arpeggio, ascending — the class celebration sound. */
  function fanfare() {
    var notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    for (var i = 0; i < notes.length; i++) {
      tone(notes[i], 0.34, 'triangle', 0.22, i * 0.11);
    }
    tone(1046.5, 0.6, 'triangle', 0.18, notes.length * 0.11);
  }

  /* One bright ping per star, staggered. */
  function starChime(n) {
    n = Math.min(8, Math.max(1, n || 1));
    for (var i = 0; i < n; i++) {
      tone(1318.5 + i * 110, 0.28, 'sine', 0.20, i * 0.13);
    }
  }

  /* Gentle warm two-tone — encouraging, never sad. */
  function goodTry() {
    tone(220, 0.32, 'sine', 0.16, 0);
    tone(293.66, 0.5, 'sine', 0.16, 0.24);
  }

  /* Tiny blip for plain button taps. */
  function click() {
    tone(720, 0.05, 'square', 0.07);
  }

  NS.audio = {
    init: init,
    setMuted: setMuted,
    isMuted: isMuted,
    tick: tick,
    suspense: suspense,
    fanfare: fanfare,
    starChime: starChime,
    goodTry: goodTry,
    click: click
  };
})();
